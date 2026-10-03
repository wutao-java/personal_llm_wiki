from __future__ import annotations

import os
import subprocess
import sys
import textwrap


def test_mixed_text_and_scanned_pdf_is_not_silently_published(tmp_path) -> None:
    env = os.environ.copy()
    env.update(
        {
            "LMWK_DATA_DIR": str(tmp_path / "scan-guard"),
            "LMWK_FIXTURE_DIR": str(tmp_path / "missing-fixture"),
            "LMWK_TESTING": "true",
            "LMWK_SEED_FIXTURE": "false",
            "DEEPSEEK_API_KEY": "",
            "LMWK_OCR_EXECUTABLE": str(tmp_path / "missing-tesseract.exe"),
        }
    )
    script = textwrap.dedent(
        """
        import io
        import os
        import sys
        from pathlib import Path
        from fastapi.testclient import TestClient
        from pypdf import PdfWriter
        from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject, NumberObject
        from app.main import app
        from app.core.config import reset_settings

        writer = PdfWriter()
        font = writer._add_object(DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica'),
        }))
        page = writer.add_blank_page(width=400, height=400)
        page[NameObject('/Resources')] = DictionaryObject({
            NameObject('/Font'): DictionaryObject({NameObject('/F1'): font}),
        })
        stream = DecodedStreamObject()
        stream.set_data(b'BT /F1 12 Tf 24 350 Td (Python files close after a with block. '
                        b'The source explains file handles clearly.) Tj ET')
        page[NameObject('/Contents')] = writer._add_object(stream)

        page = writer.add_blank_page(width=400, height=400)
        image = DecodedStreamObject()
        image.set_data(bytes([0, 127, 127, 255]))
        image.update({
            NameObject('/Type'): NameObject('/XObject'),
            NameObject('/Subtype'): NameObject('/Image'),
            NameObject('/Width'): NumberObject(2), NameObject('/Height'): NumberObject(2),
            NameObject('/ColorSpace'): NameObject('/DeviceGray'),
            NameObject('/BitsPerComponent'): NumberObject(8),
        })
        page[NameObject('/Resources')] = DictionaryObject({
            NameObject('/XObject'): DictionaryObject({NameObject('/Im1'): writer._add_object(image)}),
        })
        image_stream = DecodedStreamObject()
        image_stream.set_data(b'q 300 0 0 300 20 20 cm /Im1 Do Q')
        page[NameObject('/Contents')] = writer._add_object(image_stream)
        buffer = io.BytesIO()
        writer.write(buffer)

        with TestClient(app) as client:
            old_doc = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('legacy.doc', b'not-supported', 'application/msword'))])
            assert old_doc.json()['acceptedCount'] == 0
            assert old_doc.json()['items'][0]['status'] == 'failed'
            result = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('mixed.pdf', buffer.getvalue(), 'application/pdf'))])
            assert result.status_code == 202
            payload = result.json()
            assert payload['acceptedCount'] == 0
            assert payload['runId'] is None
            assert payload['items'][0]['status'] == 'failed'
            assert '第 2 页' in payload['items'][0]['message']
            assert 'OCR' in payload['items'][0]['message']
            bootstrap = client.get('/api/v1/bootstrap').json()
            assert bootstrap['project']['sourceCount'] == 0
            assert bootstrap['snapshot'] is None
            empty_language_data = Path(os.environ['LMWK_DATA_DIR']) / 'empty-tessdata'
            empty_language_data.mkdir()
            os.environ['LMWK_OCR_EXECUTABLE'] = sys.executable
            os.environ['LMWK_OCR_DATA_DIR'] = str(empty_language_data)
            reset_settings()
            missing_language = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('missing-language.pdf', buffer.getvalue(), 'application/pdf'))])
            assert missing_language.json()['acceptedCount'] == 0
            assert 'eng 或 chi_sim' in missing_language.json()['items'][0]['message']
            assert client.get('/api/v1/bootstrap').json()['project']['sourceCount'] == 0
            image[NameObject('/Width')] = NumberObject(100000)
            image[NameObject('/Height')] = NumberObject(100000)
            oversized = io.BytesIO()
            writer.write(oversized)
            too_large = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('oversized-scan.pdf', oversized.getvalue(), 'application/pdf'))])
            assert too_large.json()['acceptedCount'] == 0
            assert 'PDF 嵌入图片超过处理限制' in too_large.json()['items'][0]['message']
            assert client.get('/api/v1/bootstrap').json()['project']['sourceCount'] == 0
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script], env=env, capture_output=True,
        text=True, timeout=30, check=False,
    )
    assert result.returncode == 0, (result.stdout + result.stderr)[-3000:]
