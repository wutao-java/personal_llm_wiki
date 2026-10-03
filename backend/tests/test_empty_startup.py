from __future__ import annotations

import os
import subprocess
import sys
import textwrap


def test_personal_database_starts_empty_and_publishes_first_snapshot(tmp_path) -> None:
    env = os.environ.copy()
    env.update(
        {
            "LMWK_DATA_DIR": str(tmp_path / "personal"),
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
        from sqlalchemy import func, select
        from app.db.models import CompileRun, Evidence, KnowledgeItem, Project, Source, SourceVersion
        from app.db.session import session_factory
        from app.main import app
        from app.services.compilation import accept_run

        with TestClient(app) as client:
            bootstrap = client.get('/api/v1/bootstrap')
            assert bootstrap.status_code == 200, bootstrap.text
            initial = bootstrap.json()
            assert initial['project']['projectId'] == 'PROJECT-PERSONAL-WIKI'
            assert initial['project']['sourceCount'] == 0
            assert initial['project']['sourceVersionCount'] == 0
            assert initial['project']['seededVersion'] is None
            assert initial['snapshot'] is None
            assert client.get('/api/v1/knowledge').json()['items'] == []
            graph = client.get('/api/v1/graph').json()
            assert graph['snapshotId'] is None
            assert graph['counts'] == {'nodes': 0, 'edges': 0}
            assert client.get('/api/v1/suggested-questions').json()['items'] == []
            quality = client.get('/api/v1/answer-quality').json()
            assert quality['items'] == [] and quality['summary']['answerCount'] == 0
            assert quality['summary']['attentionCount'] == 0
            conversation = client.post('/api/v1/conversations', json={'contextKnowledgeIds': []})
            assert conversation.status_code == 201
            question = client.post(
                f"/api/v1/conversations/{conversation.json()['conversationId']}/questions",
                json={'question': '没有知识时不能问答'},
            )
            assert question.status_code == 404

            imported = client.post(
                '/api/v1/sources/import',
                files=[('files', ('java.md', b'# Java concurrency\\n\\nThe lock protects a shared counter. ' * 4, 'text/markdown'))],
            )
            assert imported.status_code == 202, imported.text
            item = imported.json()['items'][0]
            run_id = imported.json()['runId']
            assert item['status'] == 'imported'
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                run = client.get(f'/api/v1/compile-runs/{run_id}').json()
                if run['status'] == 'failed':
                    break
                time.sleep(0.05)
            assert run['status'] == 'failed', run
            assert run['error']['code'] == 'deepseek_not_ready'
            content = client.get(f"/api/v1/source-versions/{item['sourceVersionId']}/content")
            assert content.status_code == 200
            assert 'Java concurrency' in content.json()['content']

            with session_factory()() as session:
                version = session.get(SourceVersion, item['sourceVersionId'])
                evidence = session.scalar(select(Evidence).where(Evidence.source_version_id == version.source_version_id))
                assert evidence is not None
                failed = session.get(CompileRun, run_id)
                failed.status = 'awaiting_review'
                failed.candidate = {
                    'knowledgeItems': [{
                        'knowledgeId': 'K-JAVA-CONCURRENCY', 'slug': 'java-concurrency',
                        'title': 'Java concurrency', 'type': 'concept', 'domain': 'knowledge',
                        'summary': 'Lock protects a shared counter.',
                        'markdown': '# Java concurrency\\n\\nLock protects a shared counter.',
                        'reviewStatus': 'accepted', 'sourceIds': [item['sourceId']],
                        'sourceVersionIds': [version.source_version_id],
                        'evidenceIds': [evidence.evidence_id], 'changeType': 'added',
                    }], 'relations': [],
                }
                session.commit()
                published = accept_run(session, run_id)
                assert published['snapshotId']
                assert session.scalar(select(func.count()).select_from(KnowledgeItem)) == 1
                assert session.get(Project, 'PROJECT-PERSONAL-WIKI').current_snapshot_id == published['snapshotId']
            assert client.get('/api/v1/graph').json()['counts'] == {'nodes': 1, 'edges': 0}
            assert client.get('/api/v1/knowledge').json()['total'] == 1
            assert client.get('/api/v1/evidence/' + evidence.evidence_id).json()['accessible'] is True
        with TestClient(app) as client:
            restarted = client.get('/api/v1/bootstrap').json()
            assert restarted['project']['sourceCount'] == 1
            assert restarted['snapshot']['knowledgeCount'] == 1
            assert restarted['project']['seededVersion'] is None
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
