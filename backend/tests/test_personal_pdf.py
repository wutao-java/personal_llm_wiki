from __future__ import annotations

import os
import subprocess
import sys
import textwrap


def test_personal_text_pdf_compiles_and_retains_evidence(tmp_path) -> None:
    env = os.environ.copy()
    env.update(
        {
            "LMWK_DATA_DIR": str(tmp_path / "personal-pdf"),
            "LMWK_FIXTURE_DIR": str(tmp_path / "missing-fixture"),
            "LMWK_TESTING": "true",
            "LMWK_SEED_FIXTURE": "false",
            "DEEPSEEK_API_KEY": "",
        }
    )
    script = textwrap.dedent(
        """
        import hashlib
        import io
        import time
        from fastapi.testclient import TestClient
        from pypdf import PdfWriter
        from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
        from sqlalchemy import select
        from app.adapters.deepseek import CompilePayload
        from app.db.models import SourceVersion
        from app.db.session import session_factory
        from app.main import app
        from app.services import compilation
        from app.services.settings import current_profile

        writer = PdfWriter()
        font = DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica'),
        })
        font_ref = writer._add_object(font)
        for text in (
            b'Python context manager releases resources after the block. '
            b'Use it to close a file safely.',
            b'The second page describes the with block closing files safely. '
            b'This prevents leaked file handles in Python.',
        ):
            page = writer.add_blank_page(width=400, height=400)
            page[NameObject('/Resources')] = DictionaryObject({
                NameObject('/Font'): DictionaryObject({NameObject('/F1'): font_ref}),
            })
            stream = DecodedStreamObject()
            stream.set_data(b'BT /F1 12 Tf 24 350 Td (' + text + b') Tj ET')
            page[NameObject('/Contents')] = writer._add_object(stream)
        buffer = io.BytesIO()
        writer.write(buffer)
        original = buffer.getvalue()

        class TestCompiler:
            async def compile_knowledge(self, *, evidence, existing_knowledge):
                assert not existing_knowledge
                assert evidence and evidence[0]['topic'] == 'Python'
                assert 'context manager' in evidence[0]['quote']
                assert len(evidence) == 2
                assert evidence[0]['pageNumber'] == 1
                assert evidence[1]['pageNumber'] == 2
                evidence_id = evidence[0]['evidenceId']
                second_evidence_id = evidence[1]['evidenceId']
                return CompilePayload.model_validate({
                    'knowledge_items': [
                        {'title': 'Python context managers', 'type': 'concept',
                         'domain': 'Python', 'summary': 'Context managers release file resources.',
                         'markdown': '# Python context managers\\n\\nUse a context manager to close a file safely.',
                         'evidence_ids': [evidence_id]},
                        {'title': 'Closing files safely', 'type': 'practice',
                         'domain': 'Python', 'summary': 'A with block closes an opened file.',
                         'markdown': '# Closing files safely\\n\\nA with block closes an opened file safely.',
                         'evidence_ids': [second_evidence_id]},
                    ],
                    'relations': [{
                        'source_title': 'Python context managers',
                        'target_title': 'Closing files safely', 'type': 'supports',
                        'evidence_ids': [second_evidence_id],
                    }],
                })

        def test_get_client(session, *, require_available):
            return current_profile(session), TestCompiler()
        compilation.get_client = test_get_client

        with TestClient(app) as client:
            assert client.get('/api/v1/bootstrap').json()['snapshot'] is None
            uploaded = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('python.pdf', original, 'application/pdf'))])
            assert uploaded.status_code == 202, uploaded.text
            result = uploaded.json()
            assert result['acceptedCount'] == 1
            source_version_id = result['items'][0]['sourceVersionId']
            with session_factory()() as session:
                version = session.get(SourceVersion, source_version_id)
                from pathlib import Path
                assert hashlib.sha256(Path(version.original_path).read_bytes()).hexdigest() == version.content_sha256
                assert 'context manager' in version.extracted_text
                assert [page['pageNumber'] for page in version.page_spans] == [1, 2]
                assert version.page_spans[1]['charStart'] > version.page_spans[0]['charEnd']
                assert version.page_spans[1]['charEnd'] == len(version.extracted_text)
            content = client.get(f'/api/v1/source-versions/{source_version_id}/content').json()
            assert content['pageSpans'][1]['pageNumber'] == 2
            original_response = client.get(f'/api/v1/source-versions/{source_version_id}/original')
            assert original_response.status_code == 200
            assert original_response.content == original
            assert original_response.headers['content-type'].startswith('application/pdf')
            source = client.get('/api/v1/sources').json()['items'][0]
            assert source['domain'] == 'Python'
            run_id = result['runId']
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                run = client.get(f'/api/v1/compile-runs/{run_id}').json()
                if run['status'] in {'awaiting_review', 'failed'}:
                    break
                time.sleep(0.05)
            assert run['status'] == 'awaiting_review', run
            review = client.get(f'/api/v1/compile-runs/{run_id}/review')
            assert review.status_code == 200, review.text
            assert len(review.json()['knowledgeItems']) == 2
            accepted = client.post(f'/api/v1/compile-runs/{run_id}/accept')
            assert accepted.status_code == 200, accepted.text
            knowledge = client.get('/api/v1/knowledge').json()
            assert knowledge['total'] == 2
            assert [domain['id'] for domain in knowledge['domains']] == ['Python']
            graph = client.get('/api/v1/graph').json()
            assert graph['counts'] == {'nodes': 2, 'edges': 1}
            assert [domain['id'] for domain in graph['domains']] == ['Python']
            assert {node['domainId'] for node in graph['nodes']} == {'Python'}
            details = {
                item['title']: client.get('/api/v1/knowledge/' + item['knowledgeId']).json()
                for item in knowledge['items']
            }
            assert details['Python context managers']['evidence'][0]['pageNumber'] == 1
            second = details['Closing files safely']['evidence'][0]
            assert second['sourceVersionId'] == source_version_id
            assert second['pageNumber'] == 2
            citation = client.get('/api/v1/evidence/' + second['evidenceId']).json()
            assert citation['accessible'] is True
            assert citation['pageNumber'] == 2
            assert 'second page' in citation['quote']
            assert client.get('/api/v1/bootstrap').json()['snapshot']['knowledgeCount'] == 2
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
