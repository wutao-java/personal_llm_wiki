from __future__ import annotations

import os
import subprocess
import sys
import textwrap


def test_remove_source_and_compile_records_preserve_history(tmp_path) -> None:
    env = os.environ.copy()
    env.update({
        "LMWK_DATA_DIR": str(tmp_path / "personal-removal"),
        "LMWK_FIXTURE_DIR": str(tmp_path / "missing-fixture"),
        "LMWK_TESTING": "true",
        "LMWK_SEED_FIXTURE": "false",
        "DEEPSEEK_API_KEY": "",
    })
    script = textwrap.dedent(
        """
        import hashlib
        from pathlib import Path
        from fastapi.testclient import TestClient
        from sqlalchemy import select
        from app.core.config import get_settings
        from app.db.models import CompileEvent, CompileRun, Evidence, KnowledgeItem, Project, Relation, Snapshot, Source, SourceVersion, SuggestedQuestion
        from app.db.session import session_factory
        from app.main import app
        from app.services.seed import rebuild_search_index

        with TestClient(app) as client:
            with session_factory()() as session:
                project = session.get(Project, 'PROJECT-PERSONAL-WIKI')
                for key in ('A', 'B'):
                    content = f'Original source {key} with traceable evidence.'.encode()
                    path = get_settings().data_dir / 'sources' / key / 'original.md'
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(content)
                    session.add(Source(source_id=key, project_id=project.project_id, title=key,
                        filename=f'{key}.md', domain='Python', current_version_id=f'V-{key}',
                        status='ready', knowledge_count=2))
                session.commit()
                for key in ('A', 'B'):
                    content = f'Original source {key} with traceable evidence.'.encode()
                    path = get_settings().data_dir / 'sources' / key / 'original.md'
                    session.add(SourceVersion(source_version_id=f'V-{key}', source_id=key,
                        version='1.0', content_sha256=hashlib.sha256(content).hexdigest(),
                        original_path=str(path), original_filename=f'{key}.md',
                        size_bytes=len(content), extracted_text=content.decode()))
                session.commit()
                for key in ('A', 'B'):
                    content = f'Original source {key} with traceable evidence.'.encode()
                    path = get_settings().data_dir / 'sources' / key / 'original.md'
                    session.add(Evidence(evidence_id=f'E-{key}', source_id=key,
                        source_version_id=f'V-{key}', path=str(path), quote=content.decode(),
                        char_start=0, char_end=len(content)))
                session.commit()
                snapshot = Snapshot(snapshot_id='S-OLD', project_id=project.project_id,
                    version='1', knowledge_count=3, relation_count=1, evidence_count=2,
                    source_version_count=2)
                session.add(snapshot)
                session.commit()
                for key, sources in (('A', ['A']), ('B', ['B']), ('SHARED', ['A', 'B'])):
                    session.add(KnowledgeItem(snapshot_id='S-OLD', knowledge_id=f'K-{key}',
                        slug=key.lower(), title=f'Knowledge {key}', type='concept',
                        domain='Python', summary=f'Knowledge from {key}',
                        markdown=f'# Knowledge {key}', source_ids=sources,
                        source_version_ids=[f'V-{s}' for s in sources],
                        evidence_ids=[f'E-{s}' for s in sources]))
                session.add(Relation(snapshot_id='S-OLD', relation_id='R-AB',
                    source_knowledge_id='K-A', target_knowledge_id='K-B', type='related',
                    directed=True, evidence_ids=['E-A']))
                session.add(SuggestedQuestion(snapshot_id='S-OLD', question_id='Q-OLD',
                    text='Question about A', related_knowledge_ids=['K-A']))
                project.current_snapshot_id = 'S-OLD'
                session.add(CompileRun(run_id='RUN-DONE', project_id=project.project_id,
                    status='completed', stage='completed', source_version_ids=['V-A'],
                    counts={}, published_snapshot_id='S-OLD'))
                session.commit()
                session.add(CompileEvent(run_id='RUN-DONE', sequence=1, stage='completed',
                    message='Published', counts={}))
                session.commit()
                rebuild_search_index(session, 'S-OLD')

            removed = client.delete('/api/v1/sources/A')
            assert removed.status_code == 200, removed.text
            assert removed.json()['removedKnowledgeCount'] == 2
            assert client.get('/api/v1/sources').json()['total'] == 1
            assert client.get('/api/v1/sources').json()['items'][0]['knowledgeCount'] == 1
            assert client.get('/api/v1/knowledge').json()['total'] == 1
            assert client.get('/api/v1/knowledge').json()['items'][0]['knowledgeId'] == 'K-B'
            assert client.get('/api/v1/graph').json()['counts'] == {'nodes': 1, 'edges': 0}
            assert client.get('/api/v1/suggested-questions').json()['items'] == []
            assert client.get('/api/v1/evidence/E-A').json()['accessible'] is True
            assert client.get('/api/v1/source-versions/V-A/content').status_code == 200
            assert client.get('/api/v1/source-versions/V-A/original').status_code == 200
            assert client.get('/api/v1/knowledge/K-A').status_code == 404
            assert client.delete('/api/v1/sources/A').status_code == 400
            with session_factory()() as session:
                from app.services.knowledge import search_knowledge
                project = session.get(Project, 'PROJECT-PERSONAL-WIKI')
                assert 'K-A' not in [item.knowledge_id for item in search_knowledge(session, project.current_snapshot_id, 'Knowledge A')]
                assert session.get(Snapshot, 'S-OLD')

            removed_run = client.delete('/api/v1/compile-runs/RUN-DONE')
            assert removed_run.status_code == 204, removed_run.text
            assert client.get('/api/v1/compile-runs/RUN-DONE').status_code == 404
            assert client.get('/api/v1/knowledge').json()['total'] == 1
            with session_factory()() as session:
                assert session.scalars(select(CompileEvent).where(CompileEvent.run_id == 'RUN-DONE')).all() == []
                session.add(CompileRun(run_id='RUN-REVIEW', project_id='PROJECT-PERSONAL-WIKI',
                    status='awaiting_review', stage='awaiting_review', source_version_ids=['V-A'],
                    counts={}, candidate={'knowledgeItems': [], 'relations': []}))
                session.commit()
            assert client.delete('/api/v1/compile-runs/RUN-REVIEW').status_code == 400
            cancelled = client.post('/api/v1/compile-runs/RUN-REVIEW/cancel')
            assert cancelled.status_code == 200, cancelled.text
            assert cancelled.json()['status'] == 'cancelled'
            assert client.post('/api/v1/compile-runs/RUN-REVIEW/accept').status_code == 400
            assert client.delete('/api/v1/compile-runs/RUN-REVIEW').status_code == 204
            assert client.delete('/api/v1/sources/B').status_code == 200
            assert client.get('/api/v1/knowledge').json()['total'] == 0
            assert client.get('/api/v1/graph').json()['counts'] == {'nodes': 0, 'edges': 0}
            assert client.get('/api/v1/bootstrap').json()['snapshot'] is None
            assert client.get('/api/v1/bootstrap').json()['project']['sourceCount'] == 0
            assert client.get('/api/v1/evidence/E-B').json()['accessible'] is True
            imported = client.post('/api/v1/sources/import',
                files={'files': ('A.md', b'Original source A with traceable evidence.', 'text/markdown')})
            assert imported.status_code == 202, imported.text
            assert imported.json()['items'][0]['status'] == 'imported'
            assert imported.json()['items'][0]['sourceId'] != 'A'
            assert client.get('/api/v1/sources').json()['total'] == 1
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script], env=env, capture_output=True, text=True,
        timeout=30, check=False,
    )
    assert result.returncode == 0, (result.stdout + result.stderr)[-3000:]


def test_cancel_running_compile_stops_worker(tmp_path) -> None:
    env = os.environ.copy()
    env.update({
        "LMWK_DATA_DIR": str(tmp_path / "running-cancel"),
        "LMWK_FIXTURE_DIR": str(tmp_path / "missing-fixture"),
        "LMWK_TESTING": "true",
        "LMWK_SEED_FIXTURE": "false",
        "DEEPSEEK_API_KEY": "",
    })
    script = textwrap.dedent(
        """
        import asyncio
        import time
        from types import SimpleNamespace
        from fastapi.testclient import TestClient
        from app.main import app
        from app.services import compilation

        class WaitingClient:
            async def compile_knowledge(self, **kwargs):
                await asyncio.sleep(30)
                raise AssertionError('cancelled work continued')

        compilation.get_client = lambda *args, **kwargs: (
            SimpleNamespace(profile_id='deepseek-default', model_id='test'), WaitingClient()
        )
        with TestClient(app) as client:
            response = client.post('/api/v1/sources/import',
                files={'files': ('running.md', b'A sufficiently long body of source evidence for the worker.', 'text/markdown')})
            assert response.status_code == 202, response.text
            run_id = response.json()['runId']
            for _ in range(100):
                if client.get(f'/api/v1/compile-runs/{run_id}').json()['stage'] == 'compiling':
                    break
                time.sleep(0.02)
            else:
                raise AssertionError('worker did not reach compiling')
            cancelled = client.post(f'/api/v1/compile-runs/{run_id}/cancel')
            assert cancelled.status_code == 200, cancelled.text
            assert cancelled.json()['status'] == 'cancelled'
            assert client.get(f'/api/v1/compile-runs/{run_id}').json()['status'] == 'cancelled'
            assert client.get('/api/v1/bootstrap').json()['snapshot'] is None
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script], env=env, capture_output=True, text=True,
        timeout=30, check=False,
    )
    assert result.returncode == 0, (result.stdout + result.stderr)[-3000:]
