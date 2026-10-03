from __future__ import annotations

import os
import subprocess
import sys
import textwrap


def test_review_task_survives_restart_and_publishes_cited_answer(tmp_path) -> None:
    env = os.environ.copy()
    env.update(
        {
            "LMWK_DATA_DIR": str(tmp_path / "personal-recovery"),
            "LMWK_FIXTURE_DIR": str(tmp_path / "missing-fixture"),
            "LMWK_TESTING": "true",
            "LMWK_SEED_FIXTURE": "false",
            "DEEPSEEK_API_KEY": "",
        }
    )
    script = textwrap.dedent(
        """
        import time
        from fastapi.testclient import TestClient
        from app.adapters.deepseek import CompilePayload
        from app.main import app
        from app.services import compilation, qa
        from app.services.settings import current_profile

        class OfflineClient:
            async def compile_knowledge(self, *, evidence, existing_knowledge):
                assert not existing_knowledge
                assert evidence and all(item['topic'] == 'Python' for item in evidence)
                body = next(item for item in evidence if 'close file handles' in item['quote'])
                return CompilePayload.model_validate({
                    'knowledge_items': [{
                        'title': 'Python context managers', 'type': 'concept', 'domain': 'Python',
                        'summary': 'Python context managers close file handles after a with block.',
                        'markdown': '# Python context managers\\n\\nA with block closes file handles after use.',
                        'evidence_ids': [body['evidenceId']],
                    }],
                    'relations': [],
                })

            async def stream_answer(self, *, question, evidence):
                assert 'Python context managers' in question
                assert evidence and evidence[0]['sourceTitle'] == 'python'
                yield 'A Python context manager closes file handles after the block. [1]'

        def offline_client(session, *, require_available):
            return current_profile(session), OfflineClient()

        compilation.get_client = offline_client
        qa.get_client = offline_client
        content = b'# Python context managers\\n\\nPython context managers close file handles after leaving a with block. '
        content += b'The original source stays unchanged while the knowledge page is published.'

        with TestClient(app) as client:
            uploaded = client.post('/api/v1/sources/import', data={'topic': 'Python'},
                files=[('files', ('python.md', content, 'text/markdown'))])
            assert uploaded.status_code == 202, uploaded.text
            run_id = uploaded.json()['runId']
            source_version_id = uploaded.json()['items'][0]['sourceVersionId']
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                run = client.get(f'/api/v1/compile-runs/{run_id}').json()
                if run['status'] in {'awaiting_review', 'failed'}:
                    break
                time.sleep(0.05)
            assert run['status'] == 'awaiting_review', run
            assert client.get('/api/v1/bootstrap').json()['snapshot'] is None

        with TestClient(app) as client:
            listed = client.get('/api/v1/compile-runs?pageSize=100').json()['items']
            assert any(item['runId'] == run_id and item['status'] == 'awaiting_review' for item in listed)
            review = client.get(f'/api/v1/compile-runs/{run_id}/review').json()
            assert review['knowledgeItems'][0]['domain'] == 'Python'
            published = client.post(f'/api/v1/compile-runs/{run_id}/accept')
            assert published.status_code == 200, published.text
            snapshot_id = published.json()['snapshotId']
            assert snapshot_id
            knowledge = client.get('/api/v1/knowledge').json()
            assert knowledge['total'] == 1
            item = knowledge['items'][0]
            graph = client.get('/api/v1/graph').json()
            assert graph['snapshotId'] == snapshot_id
            assert graph['nodes'][0]['knowledgeId'] == item['knowledgeId']
            detail = client.get('/api/v1/knowledge/' + item['knowledgeId']).json()
            assert detail['evidence'][0]['sourceVersionId'] == source_version_id
            conversation = client.post('/api/v1/conversations', json={'contextKnowledgeIds': []}).json()
            asked = client.post(f"/api/v1/conversations/{conversation['conversationId']}/questions",
                json={'question': 'How do Python context managers close file handles?'})
            assert asked.status_code == 202, asked.text
            answer_id = asked.json()['answerId']
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                answer = client.get(f'/api/v1/answers/{answer_id}').json()
                if answer['status'] in {'completed', 'failed', 'insufficient'}:
                    break
                time.sleep(0.05)
            assert answer['status'] == 'completed', answer
            assert answer['snapshotId'] == snapshot_id
            assert answer['citations'][0]['sourceVersionId'] == source_version_id
            assert answer['citations'][0]['evidenceId'] == detail['evidence'][0]['evidenceId']
            assert '[1]' in answer['content']

        with TestClient(app) as client:
            assert client.get('/api/v1/bootstrap').json()['snapshot']['snapshotId'] == snapshot_id
            assert client.get(f'/api/v1/answers/{answer_id}').json()['citations'][0]['sourceVersionId'] == source_version_id
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
    assert result.returncode == 0, (result.stdout + result.stderr)[-2000:]
