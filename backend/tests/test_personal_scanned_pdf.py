from __future__ import annotations

import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest


def test_real_scanned_pdf_ocr_keeps_page_and_quality(tmp_path) -> None:
    executable = os.environ.get("LMWK_TEST_OCR_EXECUTABLE")
    data_dir = os.environ.get("LMWK_TEST_OCR_DATA_DIR")
    if not executable or not data_dir:
        pytest.skip("Set LMWK_TEST_OCR_EXECUTABLE and LMWK_TEST_OCR_DATA_DIR for local OCR acceptance")
    if not Path("C:/Windows/Fonts/arial.ttf").is_file() or not Path("C:/Windows/Fonts/msyh.ttc").is_file():
        pytest.skip("Windows English and Chinese test fonts are required")
    env = os.environ.copy()
    env.update(
        {
            "LMWK_DATA_DIR": str(tmp_path / "scanned-pdf"),
            "LMWK_FIXTURE_DIR": str(tmp_path / "missing-fixture"),
            "LMWK_TESTING": "true",
            "LMWK_SEED_FIXTURE": "false",
            "DEEPSEEK_API_KEY": "",
            "LMWK_OCR_EXECUTABLE": executable,
            "LMWK_OCR_DATA_DIR": data_dir,
        }
    )
    script = textwrap.dedent(
        """
        import io
        import os
        import time
        import zlib
        from pathlib import Path
        from PIL import Image, ImageDraw, ImageFont
        from fastapi.testclient import TestClient
        from sqlalchemy import select
        from pypdf import PdfWriter
        from pypdf.generic import DecodedStreamObject, DictionaryObject, EncodedStreamObject, NameObject, NumberObject
        from app.adapters.deepseek import CompilePayload
        from app.db.models import Evidence, KnowledgeItem
        from app.db.session import session_factory
        from app.main import app
        from app.services import compilation
        from app.services.qa import _build_evidence
        from app.services.settings import current_profile

        writer = PdfWriter()
        font = writer._add_object(DictionaryObject({
            NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica'),
        }))
        first = writer.add_blank_page(width=595, height=842)
        first[NameObject('/Resources')] = DictionaryObject({
            NameObject('/Font'): DictionaryObject({NameObject('/F1'): font}),
        })
        first_text = b'Python source management retains immutable originals and supports page citations.'
        stream = DecodedStreamObject()
        stream.set_data(b'BT /F1 12 Tf 25 780 Td (' + first_text + b') Tj ET')
        first[NameObject('/Contents')] = writer._add_object(stream)

        image = Image.new('L', (1800, 2400), 255)
        draw = ImageDraw.Draw(image)
        english = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 54)
        chinese = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 56)
        for index, sentence in enumerate((
            'Python Agent notes preserve the original source.',
            'The second PDF page is a printed paper scan.',
            'Always cite the exact physical page number.',
            'A reliable answer keeps a readable quotation.',
            'Low confidence recognition must not be published.',
        )):
            draw.text((110, 180 + index * 115), sentence, font=english, fill=0)
        draw.text((110, 1050), '知识库扫描资料保留真实来源和物理页码。', font=chinese, fill=0)
        draw.text((110, 1150), '中文文字识别应显示质量并可核对原件。', font=chinese, fill=0)
        second = writer.add_blank_page(width=595, height=842)
        raster = EncodedStreamObject()
        raster._data = zlib.compress(image.tobytes(), 6)
        raster.update({
            NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Image'),
            NameObject('/Filter'): NameObject('/FlateDecode'),
            NameObject('/Width'): NumberObject(1800), NameObject('/Height'): NumberObject(2400),
            NameObject('/ColorSpace'): NameObject('/DeviceGray'), NameObject('/BitsPerComponent'): NumberObject(8),
        })
        second[NameObject('/Resources')] = DictionaryObject({
            NameObject('/XObject'): DictionaryObject({NameObject('/Scan'): writer._add_object(raster)}),
        })
        image_stream = DecodedStreamObject()
        image_stream.set_data(b'q 595 0 0 842 0 0 cm /Scan Do Q')
        second[NameObject('/Contents')] = writer._add_object(image_stream)
        buffer = io.BytesIO()
        writer.write(buffer)
        original = buffer.getvalue()
        assert len(original) < 10 * 1024 * 1024

        class OfflineClient:
            async def compile_knowledge(self, *, evidence, existing_knowledge):
                scanned = (next((item for item in evidence if item['pageNumber'] == 3), None)
                           or next((item for item in evidence if 'Human verified' in item['quote']), None)
                           or next(item for item in evidence if item['pageNumber'] == 2))
                assert scanned['topic'] == 'Python'
                assert 'Python Agent notes' in scanned['quote'] or 'Human verified' in scanned['quote']
                return CompilePayload.model_validate({
                    'knowledge_items': [{
                        'title': f"Scanned source page {scanned['pageNumber']}", 'type': 'concept', 'domain': 'Python',
                        'summary': 'Cite the physical PDF page.',
                        'markdown': '# Scanned source page\\n\\nCite original evidence.',
                        'evidence_ids': [scanned['evidenceId']],
                    }],
                    'relations': [],
                })

        def offline_client(session, *, require_available):
            return current_profile(session), OfflineClient()
        compilation.get_client = offline_client
        with TestClient(app) as client:
            uploaded = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('mixed-scan.pdf', original, 'application/pdf'))])
            assert uploaded.status_code == 202, uploaded.text
            payload = uploaded.json()
            assert payload['acceptedCount'] == 1, payload
            version_id = payload['items'][0]['sourceVersionId']
            content = client.get(f'/api/v1/source-versions/{version_id}/content').json()
            assert content['pageSpans'][0]['extractionMethod'] == 'text'
            assert content['pageSpans'][1]['extractionMethod'] == 'ocr'
            assert content['pageSpans'][1]['qualityScore'] >= 65
            assert 'Python Agent notes' in content['content']
            assert '知识库' in content['content'].replace(' ', '')
            assert client.get(f'/api/v1/source-versions/{version_id}/original').content == original
            run_id = payload['runId']
            deadline = time.monotonic() + 12
            while time.monotonic() < deadline:
                run = client.get(f'/api/v1/compile-runs/{run_id}').json()
                if run['status'] in {'awaiting_review', 'failed'}:
                    break
                time.sleep(0.05)
            assert run['status'] == 'awaiting_review', run
            assert client.post(f'/api/v1/compile-runs/{run_id}/accept').status_code == 200
            item_id = client.get('/api/v1/knowledge').json()['items'][0]['knowledgeId']
            evidence = client.get(f'/api/v1/knowledge/{item_id}').json()['evidence'][0]
            assert evidence['pageNumber'] == 2
            assert evidence['extractionMethod'] == 'ocr'
            assert evidence['qualityScore'] >= 65
            with session_factory()() as session:
                published = session.scalar(select(KnowledgeItem).where(KnowledgeItem.knowledge_id == item_id))
                citation = _build_evidence(session, [published])[0]
                assert citation['pageNumber'] == 2
                assert citation['extractionMethod'] == 'ocr'
                assert citation['qualityScore'] >= 65

            poor_page = writer.add_blank_page(width=595, height=842)
            poor_raster = EncodedStreamObject()
            poor_raster._data = zlib.compress(Image.new('L', (1800, 2400), 255).tobytes(), 6)
            poor_raster.update(raster)
            poor_page[NameObject('/Resources')] = DictionaryObject({
                NameObject('/XObject'): DictionaryObject({NameObject('/Empty'): writer._add_object(poor_raster)}),
            })
            poor_stream = DecodedStreamObject()
            poor_stream.set_data(b'q 595 0 0 842 0 0 cm /Empty Do Q')
            poor_page[NameObject('/Contents')] = writer._add_object(poor_stream)
            fourth_page = writer.add_blank_page(width=595, height=842)
            fourth_page[NameObject('/Resources')] = poor_page[NameObject('/Resources')]
            fourth_page[NameObject('/Contents')] = poor_page[NameObject('/Contents')]
            low_quality_pdf = io.BytesIO()
            writer.write(low_quality_pdf)
            pending_import = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('unreadable.pdf', low_quality_pdf.getvalue(), 'application/pdf'))])
            assert pending_import.status_code == 202, pending_import.text
            pending = pending_import.json()
            assert pending['acceptedCount'] == 1 and pending['runId'] is None, pending
            assert pending['items'][0]['status'] == 'needs_review'
            pending_id = pending['items'][0]['sourceVersionId']
            pending_source_id = pending['items'][0]['sourceId']
            assert client.get(f'/api/v1/source-versions/{pending_id}/original').content == low_quality_pdf.getvalue()
            before = client.get(f'/api/v1/source-versions/{pending_id}/content').json()
            assert [page['pageNumber'] for page in before['pageSpans'] if page['reviewStatus'] == 'needs_review'] == [3, 4]
            assert all(page['qualityScore'] < 65 for page in before['pageSpans'][2:])
            assert all(page['charEnd'] == page['charStart'] for page in before['pageSpans'][2:])
            assert client.get(f'/api/v1/sources/{pending_source_id}').json()['status'] == 'needs_review'
            assert client.get('/api/v1/bootstrap').json()['snapshot']['knowledgeCount'] == 1
            assert client.get('/api/v1/bootstrap').json()['project']['sourceCount'] == 2
            assert all(pending_id not in run['sourceVersionIds'] for run in client.get('/api/v1/compile-runs').json()['items'])
            with session_factory()() as session:
                assert not session.scalars(select(Evidence).where(Evidence.source_version_id == pending_id)).all()

            endpoint = f'/api/v1/source-versions/{pending_id}/ocr-review'
            third = 'Human verified Python source details on the third physical page. ' * 2
            fourth = 'Human verified continuation of the fourth physical PDF page. ' * 2
            for pages in (
                [{'pageNumber': 3, 'text': third}],
                [{'pageNumber': 3, 'text': third}, {'pageNumber': 5, 'text': fourth}],
                [{'pageNumber': 3, 'text': third}, {'pageNumber': 3, 'text': third}, {'pageNumber': 4, 'text': fourth}],
                [{'pageNumber': 3, 'text': 'too short'}, {'pageNumber': 4, 'text': fourth}],
            ):
                assert client.post(endpoint, json={'pages': pages}).status_code == 400
            assert client.get(f'/api/v1/source-versions/{pending_id}/content').json() == before
            corrected = client.post(endpoint, json={'pages': [
                {'pageNumber': 3, 'text': third}, {'pageNumber': 4, 'text': fourth},
            ]})
            assert corrected.status_code == 202, corrected.text
            assert client.post(endpoint, json={'pages': [
                {'pageNumber': 3, 'text': third}, {'pageNumber': 4, 'text': fourth},
            ]}).status_code == 400
            after = client.get(f'/api/v1/source-versions/{pending_id}/content').json()
            assert after['content'][after['pageSpans'][2]['charStart']:after['pageSpans'][2]['charEnd']] == third.strip()
            assert after['content'][after['pageSpans'][3]['charStart']:after['pageSpans'][3]['charEnd']] == fourth.strip()
            assert after['pageSpans'][3]['charStart'] == after['pageSpans'][2]['charEnd'] + 2
            assert all(page['reviewStatus'] == 'reviewed' and page['reviewedAt'] for page in after['pageSpans'][2:])
            assert [page['qualityScore'] for page in after['pageSpans']] == [page['qualityScore'] for page in before['pageSpans']]
            assert client.get(f'/api/v1/source-versions/{pending_id}/original').content == low_quality_pdf.getvalue()
            reviewed_run_id = corrected.json()['runId']
            deadline = time.monotonic() + 12
            while time.monotonic() < deadline:
                reviewed_run = client.get(f'/api/v1/compile-runs/{reviewed_run_id}').json()
                if reviewed_run['status'] in {'awaiting_review', 'failed'}:
                    break
                time.sleep(0.05)
            assert reviewed_run['status'] == 'awaiting_review', reviewed_run
            assert client.post(f'/api/v1/compile-runs/{reviewed_run_id}/accept').status_code == 200
            reviewed_item = next(item for item in client.get('/api/v1/knowledge').json()['items']
                                 if item['title'] == 'Scanned source page 3')
            reviewed_evidence = client.get(f"/api/v1/knowledge/{reviewed_item['knowledgeId']}").json()['evidence'][0]
            assert reviewed_evidence['pageNumber'] == 3
            assert reviewed_evidence['reviewStatus'] == 'reviewed'
            assert reviewed_evidence['qualityScore'] == before['pageSpans'][2]['qualityScore']
            with session_factory()() as session:
                published = session.scalar(select(KnowledgeItem).where(
                    KnowledgeItem.knowledge_id == reviewed_item['knowledgeId']))
                citation = _build_evidence(session, [published])[0]
                assert citation['reviewStatus'] == 'reviewed'
                assert citation['pageNumber'] == 3

            only_writer = PdfWriter()
            only_writer.add_page(poor_page)
            only_pdf = io.BytesIO()
            only_writer.write(only_pdf)
            empty_import = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('blank-only.pdf', only_pdf.getvalue(), 'application/pdf'))]).json()
            assert empty_import['acceptedCount'] == 1 and empty_import['runId'] is None, empty_import
            empty_id = empty_import['items'][0]['sourceVersionId']
            empty_content = client.get(f'/api/v1/source-versions/{empty_id}/content').json()
            assert empty_content['content'] == ''
            assert empty_content['pageSpans'][0]['reviewStatus'] == 'needs_review'
            assert client.get(f'/api/v1/sources/{empty_import["items"][0]["sourceId"]}').json()['status'] == 'needs_review'
            assert client.get(f'/api/v1/source-versions/{empty_id}/original').content == only_pdf.getvalue()
            assert all(empty_id not in run['sourceVersionIds'] for run in client.get('/api/v1/compile-runs').json()['items'])
            with session_factory()() as session:
                assert not session.scalars(select(Evidence).where(Evidence.source_version_id == empty_id)).all()
            browser_fixture = os.environ.get('LMWK_OCR_E2E_FIXTURE')
            if browser_fixture:
                Path(browser_fixture).write_bytes(original)
            review_fixture = os.environ.get('LMWK_OCR_REVIEW_E2E_FIXTURE')
            if review_fixture:
                Path(review_fixture).write_bytes(only_pdf.getvalue())
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script], env=env, capture_output=True,
        text=True, timeout=100, check=False,
    )
    assert result.returncode == 0, (result.stdout + result.stderr)[-4000:]
