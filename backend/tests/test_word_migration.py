from __future__ import annotations

import os
import subprocess
import sys
import textwrap


def test_word_block_migration_preserves_existing_pdf_evidence(tmp_path) -> None:
    env = os.environ.copy()
    env["LMWK_DATA_DIR"] = str(tmp_path / "word-upgrade")
    script = textwrap.dedent(
        """
        from sqlalchemy import create_engine, inspect, text
        from sqlalchemy.orm import Session
        from app.core.config import get_settings
        from app.db.models import Base, Evidence, Project, Source, SourceVersion
        from app.db.session import run_migrations

        engine = create_engine(get_settings().database_url)
        Base.metadata.create_all(engine)
        with Session(engine) as session:
            session.add(Project(project_id='P-OLD', name='retained'))
            session.flush()
            session.add(Source(source_id='S-OLD', project_id='P-OLD', title='old PDF', filename='old.pdf'))
            session.flush()
            session.add(SourceVersion(
                source_version_id='SV-OLD', source_id='S-OLD', version='1.0',
                content_sha256='a' * 64, original_path='old.pdf', original_filename='old.pdf',
                mime_type='application/pdf', size_bytes=42, extracted_text='Existing text stays.',
                page_spans=[{'pageNumber': 1, 'charStart': 0, 'charEnd': 20}], block_spans=[],
            ))
            session.flush()
            session.add(Evidence(
                evidence_id='E-OLD', source_id='S-OLD', source_version_id='SV-OLD',
                path='old.pdf', char_start=0, char_end=8, page_number=1,
                block_number=None, block_label=None, quote='Existing',
            ))
            session.commit()
        with engine.begin() as connection:
            connection.exec_driver_sql('ALTER TABLE source_versions DROP COLUMN block_spans')
            connection.exec_driver_sql('ALTER TABLE evidence_fragments DROP COLUMN block_number')
            connection.exec_driver_sql('ALTER TABLE evidence_fragments DROP COLUMN block_label')
            connection.exec_driver_sql('CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)')
            connection.execute(text('INSERT INTO alembic_version (version_num) VALUES (:revision)'),
                               {'revision': '0003_pdf_page_provenance'})
        run_migrations()
        assert {'block_spans'}.issubset({column['name'] for column in inspect(engine).get_columns('source_versions')})
        assert {'block_number', 'block_label'}.issubset(
            {column['name'] for column in inspect(engine).get_columns('evidence_fragments')})
        with Session(engine) as session:
            version = session.get(SourceVersion, 'SV-OLD')
            evidence = session.get(Evidence, 'E-OLD')
            assert version.extracted_text == 'Existing text stays.'
            assert version.page_spans[0]['pageNumber'] == 1
            assert version.block_spans == []
            assert evidence.quote == 'Existing'
            assert evidence.page_number == 1
            assert evidence.block_number is None and evidence.block_label is None
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script], env=env, capture_output=True,
        text=True, timeout=30, check=False,
    )
    assert result.returncode == 0, (result.stdout + result.stderr)[-3000:]
