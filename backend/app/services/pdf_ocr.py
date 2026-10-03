from __future__ import annotations

import csv
import math
import os
import subprocess
import tempfile
from pathlib import Path

import pypdfium2

from app.core.config import get_settings

MAX_OCR_PIXELS = 10_000_000
MAX_OCR_OUTPUT_BYTES = 2_000_000
MIN_OCR_CHARS = 40
MIN_OCR_CONFIDENCE = 65


def _ocr_configuration() -> tuple[Path, Path]:
    settings = get_settings()
    if not settings.ocr_executable or not settings.ocr_executable.is_file():
        raise ValueError("扫描 PDF 需要配置本机 Tesseract OCR 执行文件")
    if not settings.ocr_data_dir or not settings.ocr_data_dir.is_dir():
        raise ValueError("扫描 PDF 需要配置本机 OCR 语言数据目录")
    if any(not (settings.ocr_data_dir / f"{language}.traineddata").is_file() for language in ("eng", "chi_sim")):
        raise ValueError("扫描 PDF 缺少 eng 或 chi_sim OCR 语言数据")
    return settings.ocr_executable, settings.ocr_data_dir


def _read_tsv(path: Path, *, page_number: int) -> tuple[str, float]:
    if not path.is_file():
        raise ValueError(f"PDF 第 {page_number} 页 OCR 没有生成识别结果")
    if path.stat().st_size > MAX_OCR_OUTPUT_BYTES:
        raise ValueError(f"PDF 第 {page_number} 页 OCR 输出超过处理限制")
    lines: list[str] = []
    words: list[str] = []
    current_line: tuple[str, str, str, str] | None = None
    weighted_confidence = 0.0
    weight_sum = 0
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream, delimiter="\t"):
                word = (row.get("text") or "").strip()
                if not word:
                    continue
                confidence = float(row.get("conf") or "-1")
                if not math.isfinite(confidence) or confidence < 0 or confidence > 100:
                    continue
                line = tuple(row.get(key, "") for key in ("page_num", "block_num", "par_num", "line_num"))
                if line != current_line and words:
                    lines.append(" ".join(words))
                    words = []
                current_line = line
                words.append(word)
                weight = len(word)
                weighted_confidence += confidence * weight
                weight_sum += weight
    except (OSError, UnicodeError, ValueError, csv.Error) as exc:
        raise ValueError(f"PDF 第 {page_number} 页 OCR 结果无法读取") from exc
    if words:
        lines.append(" ".join(words))
    text = "\n".join(lines).strip()
    score = weighted_confidence / weight_sum if weight_sum else 0.0
    return text, round(score, 1)


def extract_scanned_page(data: bytes, page_number: int) -> tuple[str, float]:
    try:
        executable, tessdata = _ocr_configuration()
    except ValueError as exc:
        raise ValueError(f"PDF 第 {page_number} 页：{exc}") from exc
    settings = get_settings()
    with tempfile.TemporaryDirectory(prefix="pdf-ocr-", dir=settings.data_dir) as directory:
        folder = Path(directory)
        image_path = folder / "page.png"
        output_base = folder / "recognized"
        try:
            with pypdfium2.PdfDocument(data) as document:
                page = document[page_number - 1]
                try:
                    width, height = page.get_size()
                    if not all(math.isfinite(value) and value > 0 for value in (width, height)):
                        raise ValueError(f"PDF 第 {page_number} 页尺寸无效")
                    scale = 2.5
                    if width * height * scale * scale > MAX_OCR_PIXELS:
                        raise ValueError(f"PDF 第 {page_number} 页扫描图像超过像素处理限制")
                    bitmap = page.render(scale=scale)
                    try:
                        image = bitmap.to_pil().convert("RGB")
                        try:
                            image.save(image_path, format="PNG")
                        finally:
                            image.close()
                    finally:
                        bitmap.close()
                finally:
                    page.close()
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"PDF 第 {page_number} 页无法渲染用于 OCR") from exc
        if image_path.stat().st_size > 20 * 1024 * 1024:
            raise ValueError(f"PDF 第 {page_number} 页扫描图像超过处理限制")
        environment = {
            name: value for name, value in os.environ.items()
            if name.upper() in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "USERPROFILE"}
        }
        environment["OMP_THREAD_LIMIT"] = "1"
        try:
            result = subprocess.run(
                [
                    str(executable), str(image_path), str(output_base),
                    "--tessdata-dir", str(tessdata), "-l", "eng+chi_sim", "--psm", "3",
                    "-c", "tessedit_create_tsv=1", "-c", "tessedit_create_txt=0",
                ],
                env=environment,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=20,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise ValueError(f"PDF 第 {page_number} 页 OCR 超时或无法启动") from exc
        if result.returncode != 0:
            raise ValueError(f"PDF 第 {page_number} 页 OCR 识别失败，请检查本机引擎与语言数据")
        return _read_tsv(output_base.with_suffix(".tsv"), page_number=page_number)
