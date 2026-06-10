#!/usr/bin/env python3
from __future__ import annotations

import html
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "deliverables_ai_record"
PRODUCT_MD = ROOT / "docs" / "product-design.md"
TECH_MD = ROOT / "docs" / "technical-design.md"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
CP_NS = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
DC_NS = "http://purl.org/dc/elements/1.1/"
DCTERMS_NS = "http://purl.org/dc/terms/"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"


def qn(ns: str, tag: str) -> str:
    return f"{{{ns}}}{tag}"


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def make_run(text: str, *, bold: bool = False, mono: bool = False, size: int | None = None) -> str:
    parts: list[str] = []
    if bold or mono or size is not None:
        parts.append("<w:rPr>")
        if bold:
            parts.append("<w:b/>")
        if mono:
            parts.append(
                '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas"/>'
            )
        if size is not None:
            parts.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
        parts.append("</w:rPr>")
    parts.append(f'<w:t xml:space="preserve">{esc(text)}</w:t>')
    return "<w:r>" + "".join(parts) + "</w:r>"


def inline_runs(text: str) -> str:
    segments = re.split(r"(`[^`]*`)", text)
    runs: list[str] = []
    code = False
    for segment in segments:
        if not segment:
            continue
        if segment.startswith("`") and segment.endswith("`") and len(segment) >= 2:
            runs.append(make_run(segment[1:-1], mono=True))
        else:
            runs.append(make_run(segment))
    return "".join(runs)


def paragraph(
    text: str = "",
    *,
    style: str = "Normal",
    bold: bool = False,
    mono: bool = False,
    align: str | None = None,
    left: int | None = None,
    first_line: int | None = None,
    spacing_before: int | None = None,
    spacing_after: int | None = None,
) -> str:
    ppr: list[str] = [f'<w:pStyle w:val="{style}"/>']
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if left is not None or first_line is not None:
        attrs = []
        if left is not None:
            attrs.append(f' w:left="{left}"')
        if first_line is not None:
            attrs.append(f' w:firstLine="{first_line}"')
        ppr.append(f"<w:ind{''.join(attrs)}/>")
    if spacing_before is not None or spacing_after is not None:
        attrs = []
        if spacing_before is not None:
            attrs.append(f' w:before="{spacing_before}"')
        if spacing_after is not None:
            attrs.append(f' w:after="{spacing_after}"')
        ppr.append(f"<w:spacing{''.join(attrs)}/>")
    run = make_run(text, bold=bold, mono=mono) if text else ""
    return f"<w:p><w:pPr>{''.join(ppr)}</w:pPr>{run}</w:p>"


def paragraph_inline(
    text: str,
    *,
    style: str = "Normal",
    align: str | None = None,
    left: int | None = None,
    first_line: int | None = None,
    spacing_before: int | None = None,
    spacing_after: int | None = None,
) -> str:
    ppr: list[str] = [f'<w:pStyle w:val="{style}"/>']
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if left is not None or first_line is not None:
        attrs = []
        if left is not None:
            attrs.append(f' w:left="{left}"')
        if first_line is not None:
            attrs.append(f' w:firstLine="{first_line}"')
        ppr.append(f"<w:ind{''.join(attrs)}/>")
    if spacing_before is not None or spacing_after is not None:
        attrs = []
        if spacing_before is not None:
            attrs.append(f' w:before="{spacing_before}"')
        if spacing_after is not None:
            attrs.append(f' w:after="{spacing_after}"')
        ppr.append(f"<w:spacing{''.join(attrs)}/>")
    return f"<w:p><w:pPr>{''.join(ppr)}</w:pPr>{inline_runs(text)}</w:p>"


def table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    cols = max(len(row) for row in rows)
    col_width = 1300
    grid = "".join(f'<w:gridCol w:w="{col_width}"/>' for _ in range(cols))
    tbl_rows: list[str] = []
    for row_index, row in enumerate(rows):
        cells: list[str] = []
        for cell in row:
            shading = '<w:shd w:fill="D9EAF7"/>' if row_index == 0 else ""
            cells.append(
                "<w:tc>"
                "<w:tcPr>"
                f"{shading}"
                "<w:tcW w:w=\"0\" w:type=\"auto\"/>"
                "</w:tcPr>"
                f"{paragraph_inline(cell, style='Normal')}"
                "</w:tc>"
            )
        for _ in range(cols - len(row)):
            cells.append(
                "<w:tc>"
                "<w:tcPr><w:tcW w:w=\"0\" w:type=\"auto\"/></w:tcPr>"
                f"{paragraph('', style='Normal')}"
                "</w:tc>"
            )
        tbl_rows.append("<w:tr>" + "".join(cells) + "</w:tr>")
    return (
        "<w:tbl>"
        "<w:tblPr>"
        '<w:tblStyle w:val="TableGrid"/>'
        '<w:tblW w:w="0" w:type="auto"/>'
        '<w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" '
        'w:noHBand="0" w:noVBand="1"/>'
        "</w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>"
        + "".join(tbl_rows)
        + "</w:tbl>"
    )


def is_table_separator(line: str) -> bool:
    line = line.strip()
    if "|" not in line:
        return False
    parts = [part.strip() for part in line.strip("|").split("|")]
    return bool(parts) and all(re.fullmatch(r":?-{3,}:?", part or "") for part in parts)


def split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def markdown_to_blocks(markdown: str) -> list[dict]:
    lines = markdown.splitlines()
    blocks: list[dict] = []
    paragraph_lines: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph_lines
        if paragraph_lines:
            text = " ".join(part.strip() for part in paragraph_lines if part.strip())
            if text:
                blocks.append({"type": "p", "text": text})
            paragraph_lines = []

    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip("\n")
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            i += 1
            continue

        if stripped.startswith("```"):
            flush_paragraph()
            fence = stripped[3:].strip()
            code_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i].rstrip("\n"))
                i += 1
            blocks.append({"type": "code", "lang": fence, "lines": code_lines})
            if i < len(lines):
                i += 1
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            flush_paragraph()
            blocks.append(
                {
                    "type": "heading",
                    "level": len(heading_match.group(1)),
                    "text": heading_match.group(2).strip(),
                }
            )
            i += 1
            continue

        if stripped.startswith("|") and i + 1 < len(lines) and is_table_separator(lines[i + 1]):
            flush_paragraph()
            rows = [split_table_row(line)]
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_table_row(lines[i]))
                i += 1
            blocks.append({"type": "table", "rows": rows})
            continue

        bullet_match = re.match(r"^(\s*)([-*])\s+(.*)$", line)
        ordered_match = re.match(r"^(\s*)(\d+)\.\s+(.*)$", line)
        if bullet_match:
            flush_paragraph()
            indent = len(bullet_match.group(1)) // 2
            blocks.append(
                {
                    "type": "bullet",
                    "level": indent,
                    "text": f"• {bullet_match.group(3).strip()}",
                }
            )
            i += 1
            continue
        if ordered_match:
            flush_paragraph()
            indent = len(ordered_match.group(1)) // 2
            blocks.append(
                {
                    "type": "bullet",
                    "level": indent,
                    "text": f"{ordered_match.group(2)}. {ordered_match.group(3).strip()}",
                }
            )
            i += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            blocks.append({"type": "quote", "text": stripped.lstrip("> ").strip()})
            i += 1
            continue

        paragraph_lines.append(stripped)
        i += 1

    flush_paragraph()
    return blocks


def render_blocks(blocks: list[dict]) -> str:
    parts: list[str] = []
    for block in blocks:
        kind = block["type"]
        if kind == "heading":
            level = block["level"]
            style = f"Heading{min(level, 4)}"
            parts.append(
                paragraph(
                    block["text"],
                    style=style,
                    spacing_before=160 if level <= 2 else 80,
                    spacing_after=80,
                )
            )
        elif kind == "p":
            parts.append(paragraph_inline(block["text"], style="Normal", spacing_after=80))
        elif kind == "bullet":
            indent = 720 + block["level"] * 360
            parts.append(
                paragraph_inline(
                    block["text"],
                    style="Normal",
                    left=indent,
                    spacing_after=40,
                )
            )
        elif kind == "quote":
            parts.append(
                paragraph_inline(
                    block["text"],
                    style="Quote",
                    left=720,
                    spacing_after=40,
                )
            )
        elif kind == "code":
            code_lines = block["lines"] or [""]
            for line in code_lines:
                parts.append(
                    paragraph(
                        line,
                        style="CodeBlock",
                        mono=True,
                        left=720,
                        spacing_after=0,
                    )
                )
            parts.append(paragraph("", style="CodeBlock", spacing_after=80))
        elif kind == "table":
            parts.append(table(block["rows"]))
            parts.append(paragraph("", spacing_after=80))
    body = "".join(parts)
    body += (
        "<w:sectPr>"
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" '
        'w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        f'xmlns:r="{R_NS}">'
        f"<w:body>{body}</w:body>"
        "</w:document>"
    )


def build_styles_xml() -> str:
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:styles xmlns:w="{W_NS}">
          <w:docDefaults>
            <w:rPrDefault>
              <w:rPr>
                <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
                <w:sz w:val="21"/>
                <w:szCs w:val="21"/>
              </w:rPr>
            </w:rPrDefault>
            <w:pPrDefault>
              <w:pPr>
                <w:spacing w:after="80"/>
              </w:pPr>
            </w:pPrDefault>
          </w:docDefaults>
          <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
            <w:name w:val="Normal"/>
            <w:qFormat/>
            <w:rPr>
              <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
              <w:sz w:val="21"/>
              <w:szCs w:val="21"/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Title">
            <w:name w:val="Title"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="Normal"/>
            <w:qFormat/>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:after="160"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
              <w:b/>
              <w:sz w:val="32"/>
              <w:szCs w:val="32"/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Heading1">
            <w:name w:val="heading 1"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="Normal"/>
            <w:qFormat/>
            <w:pPr>
              <w:keepNext/>
              <w:keepLines/>
              <w:spacing w:before="160" w:after="80"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
              <w:b/>
              <w:sz w:val="28"/>
              <w:szCs w:val="28"/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Heading2">
            <w:name w:val="heading 2"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="Normal"/>
            <w:qFormat/>
            <w:pPr>
              <w:keepNext/>
              <w:keepLines/>
              <w:spacing w:before="120" w:after="60"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Heading3">
            <w:name w:val="heading 3"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="Normal"/>
            <w:qFormat/>
            <w:pPr>
              <w:keepNext/>
              <w:keepLines/>
              <w:spacing w:before="100" w:after="40"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
              <w:b/>
              <w:sz w:val="22"/>
              <w:szCs w:val="22"/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Heading4">
            <w:name w:val="heading 4"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="Normal"/>
            <w:qFormat/>
            <w:pPr>
              <w:keepNext/>
              <w:keepLines/>
              <w:spacing w:before="80" w:after="40"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
              <w:b/>
              <w:sz w:val="21"/>
              <w:szCs w:val="21"/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Quote">
            <w:name w:val="Quote"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="Normal"/>
            <w:pPr>
              <w:ind w:left="720"/>
              <w:spacing w:after="40"/>
            </w:pPr>
            <w:rPr>
              <w:i/>
            </w:rPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="CodeBlock">
            <w:name w:val="CodeBlock"/>
            <w:basedOn w:val="Normal"/>
            <w:next w:val="CodeBlock"/>
            <w:pPr>
              <w:ind w:left="720"/>
              <w:spacing w:before="0" w:after="0"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas"/>
              <w:sz w:val="18"/>
              <w:szCs w:val="18"/>
            </w:rPr>
          </w:style>
        </w:styles>
        """
    ).strip()


def build_rels_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<Relationships xmlns="{REL_NS}">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        "</Relationships>"
    )


def build_document_rels_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<Relationships xmlns="{REL_NS}">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        "</Relationships>"
    )


def build_content_types_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<Types xmlns="{CT_NS}">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        "</Types>"
    )


def build_core_props(title: str) -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<cp:coreProperties xmlns:cp="{CP_NS}" xmlns:dc="{DC_NS}" xmlns:dcterms="{DCTERMS_NS}" xmlns:xsi="{XSI_NS}">'
        f"<dc:title>{esc(title)}</dc:title>"
        "<dc:creator>Codex</dc:creator>"
        "<cp:lastModifiedBy>Codex</cp:lastModifiedBy>"
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        "</cp:coreProperties>"
    )


def build_app_props(title: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        f"<Application>AgentHub</Application>"
        f"<DocSecurity>0</DocSecurity>"
        f"<ScaleCrop>false</ScaleCrop>"
        f"<HeadingPairs><vt:vector size=\"2\" baseType=\"variant\"><vt:variant><vt:lpstr>Title</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>"
        f"<TitlesOfParts><vt:vector size=\"1\" baseType=\"lpstr\"><vt:lpstr>{esc(title)}</vt:lpstr></vt:vector></TitlesOfParts>"
        f"<Company></Company>"
        f"<LinksUpToDate>false</LinksUpToDate>"
        f"<SharedDoc>false</SharedDoc>"
        f"<HyperlinksChanged>false</HyperlinksChanged>"
        f"<AppVersion>16.0000</AppVersion>"
        "</Properties>"
    )


def write_docx(title: str, blocks: list[dict], out_path: Path) -> None:
    document_xml = render_blocks(blocks)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", build_content_types_xml())
        zf.writestr("_rels/.rels", build_rels_xml())
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/_rels/document.xml.rels", build_document_rels_xml())
        zf.writestr("word/styles.xml", build_styles_xml())
        zf.writestr("docProps/core.xml", build_core_props(title))
        zf.writestr("docProps/app.xml", build_app_props(title))


def overview_markdown() -> str:
    return dedent(
        """
        # AgentHub 项目交付总览

        ## 1. 文档信息

        | 项目 | 内容 |
        |---|---|
        | 项目名称 | AgentHub |
        | 文档类型 | 项目交付总览 |
        | 交付版本 | 当前仓库整理版 |
        | 交付范围 | 项目总览、产品设计文档、技术设计文档 |
        | 说明 | 后两份文档已基于仓库现有内容排版为 Word 版 |

        ## 2. 项目概述

        AgentHub 是一个 IM-first 的多 Agent 协作平台 MVP。它的核心目标不是做成一个单纯的聊天界面，而是把“通过聊天发起任务、由多个 Agent 分工、输出可审阅的产物、再对产物进行修订与审批”这条主链路稳定落地。

        当前仓库已经把协作规范、产品设计、技术设计、技能卡片、规则与历史归档分层整理出来，形成了更适合 AI 协作和后续迭代的文档结构。

        ## 3. 交付物总览

        | 交付物 | 源文件 | 说明 |
        |---|---|---|
        | 项目交付总览 | 本文件 | 对项目定位、文档结构、协作规范和交付边界做总览 |
        | 产品设计文档 | `docs/product-design.md` | 说明 AgentHub 的产品定位、用户路径、功能边界和验收标准 |
        | 技术设计文档 | `docs/technical-design.md` | 说明 AgentHub 的技术架构、分层设计、Adapter、Orchestrator 和验证方案 |

        ## 4. 当前实现边界

        - 默认 demo 不依赖真实 LLM。
        - 默认 demo 不依赖真实云部署。
        - 默认 demo 不依赖多节点基础设施。
        - 默认 demo 以 `MOCK` 作为稳定兜底，真实能力需要显式切换。
        - `REAL_FIRST` 只在 contract、quality 和 build gate 通过后才生效。
        - `SSE` 是主实时链路，`WebSocket` 只做控制面。
        - `MySQL` 和 `JDBC` 是可选 profile，不是默认运行前提。

        ## 5. 产品设计文档概览

        产品设计文档说明的是“用户为什么要用 AgentHub、在什么场景下用、用的时候能看到什么”。

        这份文档重点覆盖：

        - 产品定位与背景问题。
        - 目标用户与核心使用场景。
        - 产品目标、非目标和核心原则。
        - 用户主路径、信息架构和核心功能设计。
        - MVP 边界与验收标准。

        这份文档适合给产品、设计、交付和评审人员先看，因为它回答的是“这个产品应该长什么样”。

        ## 6. 技术设计文档概览

        技术设计文档说明的是“AgentHub 为什么能这样实现、核心链路怎么跑、哪些能力是默认能力，哪些只是可选能力”。

        这份文档重点覆盖：

        - 前后端总体架构。
        - API、Application、Domain、Infrastructure 四层设计。
        - Orchestrator 的 Planner、Router、Executor、Aggregator 链路。
        - Adapter 的类型、输出契约和 `REAL_FIRST` 门控。
        - Context / Memory、Artifact 生命周期、Approval / Audit、Realtime 和持久化设计。
        - 验证方案和技术取舍。

        这份文档适合开发、联调、验收和后续扩展时作为主参考。

        ## 7. AI 协作规范沉淀

        AgentHub 的文档体系不是只存说明书，而是把和 AI 协作相关的可复用规范拆成了几层：

        - `docs/collaboration/`：沉淀 AI 协作流程、提示词模板、决策记录和阶段性开发日志，不保留完整对话。
        - `docs/spec/`：沉淀稳定、可执行、可验收的规格。
        - `docs/rules/`：沉淀全局约束与默认边界。
        - `docs/skills/`：沉淀可复用 skill 卡片，说明某类任务应该怎么做。
        - `docs/archive/`：沉淀历史版本、旧入口和阶段性材料。

        ### 7.1 Skill 对照表

        | skill 名称 | 仓库文件 | 功能说明 |
        |---|---|---|
        | `frontend-ui-skill` | `docs/skills/frontend-ui-skill.md` | 负责前端页面、组件、布局、交互和状态拆分，适合把工作台、对话流和局部 UI 改造成可维护的结构。 |
        | `backend-api-skill` | `docs/skills/backend-api-skill.md` | 负责接口、服务层、数据模型和持久化实现，适合把业务流程落到可验收的后端链路上。 |
        | `adapter-cli-skill` | `docs/skills/adapter-cli-skill.md` | 负责 Adapter 接入、CLI 探测、路由和 fallback 逻辑，适合统一真实能力与 Mock 能力的出口。 |
        | `doc-spec-skill` | `docs/skills/doc-spec-skill.md` | 负责产品、技术、规范、规则和计划整理，适合把实现结果沉淀成团队能长期执行的文档体系。 |
        | `smoke-validation-skill` | `docs/skills/smoke-validation-skill.md` | 负责构建、smoke、E2E 和回归验证，适合在交付前确认主链路真的可跑。 |

        ### 7.2 文档入口关系

        - `README.md`：项目级总入口。
        - `docs/README.md`：文档总目录。
        - `docs/collaboration/README.md`：AI 协作总入口。
        - `docs/spec/README.md`：规格索引。
        - `docs/skills/index.md`：技能索引。
        - `docs/archive/README.md`：历史归档说明。

        ## 8. 验收与交付建议

        - 本地快速启动优先使用 `scripts/start-local.ps1`。
        - 主链路回归优先跑 `node scripts/smoke-test.mjs`。
        - 涉及实时、取消和运行态时补跑 `node scripts/sse-smoke-test.mjs`。
        - 涉及前后端 UI 时补跑 `node scripts/e2e-browser.mjs`。
        - 真实模型和真实适配器验证应保持为显式 opt-in，而不是默认前提。

        ## 9. 附录

        推荐继续配合查看：

        - `docs/product-design.md`
        - `docs/technical-design.md`
        - `docs/collaboration/dev-log.md`
        - `docs/spec/README.md`
        - `docs/collaboration/README.md`
        - `docs/skills/index.md`
        """
    ).strip()


def collaboration_record_markdown() -> str:
    return dedent(
        """
        # AgentHub——AI 协作开发记录

        ## 1. 文档信息

        | 项目 | 内容 |
        |---|---|
        | 项目名称 | AgentHub |
        | 文档名称 | AgentHub——AI 协作开发记录 |
        | 记录范围 | AI 协作规范、开发阶段、关键决策、验证方式、当前边界 |
        | 记录原则 | 不保存完整对话记录，只沉淀可复用规范、阶段成果和可验证结论 |

        ## 2. 这份记录记录什么

        这份文档不是聊天纪要，也不是流水账。它记录的是 AgentHub 在 AI 协作开发过程中，如何把协作规则、规格、技能卡、开发过程和验证结果逐步沉淀成一套可持续复用的工程体系。

        核心关注点有四个：

        - 协作如何开始，怎么定义边界。
        - 开发如何分阶段推进，怎么保证每一阶段可验证。
        - 哪些能力是主链路，哪些只是 mock、placeholder 或 static demo。
        - 最终如何把代码、文档、验证和交付物收口到同一套事实来源。

        ## 3. 协作体系的事实来源

        AgentHub 现在的协作体系不是单一文档，而是一个分层系统。

        ### 3.1 优先级与约束顺序

        当文档之间出现冲突时，当前仓库采用的优先级大致是：

        1. `AGENTS.md`
        2. `docs/spec/`
        3. `docs/rules/global-rules.md`
        4. `docs/rules/routing-rules.md`
        5. `docs/rules/handoff-rules.md`
        6. `docs/skills/`
        7. `docs/collaboration/`
        8. `docs/archive/`

        这意味着：先看仓库级和目录级约束，再看稳定规格，再看可复用技能卡，最后才看过程性协作记录和历史归档。

        ### 3.2 Spec 的作用

        `docs/spec/` 负责定义“什么是必须满足的规格”。

        它强调：

        - 规格是可执行的。
        - 规格是可验收的。
        - 规格不重复记录开发过程。
        - 重叠规格必须说明主从关系。
        - Mock、fixture、static fallback 都不能冒充生产能力。

        ### 3.3 Skill 的作用

        `docs/skills/` 负责定义“某类任务怎么做”。

        它强调：

        - skill 不是 spec。
        - skill 不是重复定义规则。
        - skill 是面向执行的动作卡。
        - 每张 skill 都应当带验证命令和交付格式。
        - 当任务跨越多个领域时，优先选择最接近主变更面的 skill。

        ### 3.4 Rules 的作用

        `docs/rules/` 负责定义全局约束和默认边界。

        它强调：

        - 所有非平凡任务都要先被整理成 Task Spec。
        - 所有输出都要有明确验收标准。
        - 所有高风险操作都必须经过审批和审计。
        - Demo 优先展示可解释协作链路，而不是隐藏在后端的复杂实现。

        ### 3.5 Collaboration 的作用

        `docs/collaboration/` 负责沉淀 AI 协作流程、提示词模板、决策记录和阶段性开发日志。

        它不保留完整对话，而是保留：

        - 标准协作流程。
        - Prompt template。
        - 关键决策理由。
        - 阶段性结果。
        - 验收与演示清单。

        ## 4. 协作原则

        在整个仓库的 AI 协作过程中，形成了几条稳定原则。

        ### 4.1 不把 demo 伪装成生产

        默认 demo 不能依赖真实 LLM、真实云部署或多节点基础设施。

        原因不是“做不到”，而是为了保证：

        - 本地可重复。
        - 验证可稳定。
        - 边界可解释。
        - 成本可控。
        - 真实能力与兜底能力不会混淆。

        ### 4.2 Mock 必须可见

        Mock、fixture 和 static preview 可以存在，但必须明确标注。

        这条原则贯穿了：

        - Adapter 设计。
        - Artifact 输出。
        - Deploy Preview。
        - 文档里的验证描述。

        ### 4.3 先定义边界，再推进实现

        仓库里很多看似“功能开发”的工作，实际上先做的是边界定义：

        - 什么是主链路。
        - 什么是 optional profile。
        - 什么是 boundary 能力。
        - 什么是历史材料。
        - 什么是可以归档的旧入口。

        ### 4.4 以验证为收口

        每个阶段都尽量对应一个明确的验证方式：

        - 构建验证。
        - Smoke 验证。
        - Browser E2E。
        - Real adapter 验证。
        - JDBC / SSE / Approval / Conflict 验证。

        这保证了开发记录不是“做过什么”，而是“被什么验证过”。

        ## 5. 开发阶段记录

        下表把大量 Phase 记录收口成几个主阶段，便于阅读和交付。

        | 阶段 | 关注点 | 关键产出 | 验证方式 |
        |---|---|---|---|
        | 文档体系初始化 | 建立 spec / rules / skills / collaboration 分层 | `docs/spec`、`docs/rules`、`docs/skills`、`docs/collaboration` | 目录存在性、模板可读性 |
        | 项目骨架初始化 | 前后端工程与入口 | frontend、backend、基础路由与启动入口 | 前后端构建通过 |
        | 后端核心模型 | 领域对象与内存仓储 | Agent、Conversation、Message、TaskRun、Artifact、Context | 基础 API 联调 |
        | Demo 主链路 | 静态 demo-task 与工作台 | demo-task、Workspace 三栏、TaskRunPanel、ArtifactPanel | Demo 主路径可见 |
        | 协作显式化 | Context / Handoff / Revision / Diff | ContextSnapshot、HandoffSummary、Artifact Revision、Diff Summary | UI 可见、链路可追踪 |
        | Adapter 与真实能力 | Mock、OpenAI-compatible、Codex / Claude Code | Adapter Registry、输出契约、REAL_FIRST | Adapter smoke、质量门禁 |
        | 审批与审计 | 高风险操作控制 | Approval Gate、Action Audit、审计时间线 | 拒绝与回归验证 |
        | Realtime 与持久化 | SSE、Control Plane、Memory/JDBC/MySQL | 实时事件、runtime config、profile 切换 | SSE / JDBC / restart verify |
        | 检索与上下文 | Context Search、Memory、Pinned Context | DB-backed search、context retrieval | search / backend verify |
        | 文档与交付收口 | README、产品设计、技术设计、归档 | 交付总览、最终文档、历史归档 | 文档同步与边界核对 |

        ## 6. 关键决策记录

        ### 6.1 交付物不是聊天记录

        记录方式从一开始就刻意避开完整对话保存，改成“规范 + 结果 + 证据”的方式。

        这样做的目的，是让文档可以在后续继续复用，而不是随着某一轮聊天结束而失去价值。

        ### 6.2 只保留一个当前主入口

        对于重复入口、旧版本文档和阶段性材料，仓库采取了归档策略：

        - 主入口只保留当前活着的版本。
        - 历史版本移到 `docs/archive/`。
        - 文档首页只保留简短索引，不继续挂长篇过程记录。

        这样可以降低阅读成本，也能减少 AI 在检索时混到旧版本结论的概率。

        ### 6.3 真实能力与可演示能力分离

        仓库把真实能力和可演示能力分开管理：

        - 真实能力要过 contract、quality、build 或对应 gate。
        - 可演示能力可以先用 mock 或 static demo 顶住主路径。
        - 不能把 fallback 当成真实成功。

        ### 6.4 协作链路必须可解释

        多 Agent 协作不是只看最终回答，而是要看：

        - 谁被选中。
        - 为什么被选中。
        - 由哪个 adapter 执行。
        - 何时 fallback。
        - 哪一步进入审批。
        - 哪一步进入 artifact。

        因此仓库反复强化了 Message Stream、TaskRunPanel、Orchestrator Explain、Action Audit 和 Artifact Studio。

        ## 7. 主要阶段性演进

        ### 7.1 从文档体系到工程骨架

        第一阶段先搭起来的是协作文档结构，而不是功能本身。

        这个顺序很关键，因为它先定义了：

        - 什么能写进 spec。
        - 什么该放到 skill。
        - 什么是全局规则。
        - 什么只能进入归档。

        随后再建立前后端工程骨架、基础路由和最小数据流。

        ### 7.2 从静态 demo 到主路径闭环

        接着仓库建立了静态 demo-task 主链路、三栏工作台、TaskRun/Artifact 展示和上下文显式化。

        这一阶段的目标不是“真实智能”，而是先让用户看到：

        - 任务怎么发起。
        - 多 Agent 怎么协作。
        - 产物怎么出现。
        - 版本怎么演进。

        ### 7.3 从可见协作到可控协作

        后续阶段逐步引入：

        - Adapter Registry。
        - 真实/半真实适配器接入。
        - Approval Gate。
        - Action Audit。
        - Realtime 状态。
        - Stop / Cancel 语义。
        - Conflict 与 Revision Recovery。

        这一阶段的重点是让协作不只是“能跑”，而是“能解释、能审计、能回滚”。

        ### 7.4 从功能堆叠到产品化收口

        最后的一大段工作集中在：

        - Workspace 视觉和布局收敛。
        - Agent Builder 产品化。
        - Artifact Inspector 产品化。
        - 浏览器 E2E 覆盖。
        - 文档边界与归档整理。

        这说明仓库已经不只是原型，而是在向交付物形态收口。

        ## 8. Skills 的实际分工

        | skill 名称 | 主要职责 | 适用场景 |
        |---|---|---|
        | `frontend-ui-skill` | 前端页面、布局、交互与状态拆分 | Workspace、Agent Builder、Artifact Studio、视觉收敛 |
        | `backend-api-skill` | API、服务层、领域模型与持久化 | Orchestrator、Adapter、Approval、Repository |
        | `adapter-cli-skill` | CLI 探测、路由、fallback、适配器稳定化 | Codex / Claude Code / OpenAI-compatible 接入 |
        | `doc-spec-skill` | 文档、规范、规则、计划整理 | spec、rules、collaboration、交付总览 |
        | `smoke-validation-skill` | 构建、smoke、E2E、回归验证 | 主链路验证、真实适配器验证、浏览器验收 |

        这些 skill 的作用不是“替代开发者判断”，而是把高频工作拆成稳定动作卡，避免每次都重新解释一遍做法。

        ## 9. 当前仓库沉淀出的协作成果

        目前仓库已经沉淀出四类比较稳定的协作资产：

        - 规格资产：定义主链路、边界和验收标准。
        - 技能资产：定义不同任务类型的执行方法。
        - 规则资产：定义全局约束与默认边界。
        - 过程资产：记录阶段性成果、决策和验证。

        这些资产共同构成了 AgentHub 的 AI 协作方法论。

        ## 10. 这份记录的结论

        如果只用一句话概括，AgentHub 的 AI 协作开发不是“把 AI 当助手写代码”，而是“把 AI 协作本身产品化、规范化、可验证化”。

        这份开发记录最终证明了三件事：

        - 协作可以被拆成明确规范。
        - 开发可以被拆成可验证阶段。
        - 文档、代码和验证可以收口到同一套事实来源。

        ## 11. 建议继续配套查看

        - `docs/spec/README.md`
        - `docs/skills/index.md`
        - `docs/rules/global-rules.md`
        - `docs/collaboration/README.md`
        - `docs/collaboration/dev-log.md`
        - `docs/archive/README.md`
        - `docs/product-design.md`
        - `docs/technical-design.md`
        """
    ).strip()


def build_doc(path: Path, title: str, markdown: str) -> None:
    blocks = markdown_to_blocks(markdown)
    write_docx(title, blocks, path)


def main() -> int:
    if not PRODUCT_MD.exists():
        print(f"[FAIL] Missing source file: {PRODUCT_MD}")
        return 1
    if not TECH_MD.exists():
        print(f"[FAIL] Missing source file: {TECH_MD}")
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    overview_path = OUT_DIR / "AgentHub_项目交付总览.docx"
    collaboration_path = OUT_DIR / "AgentHub_AI协作开发记录.docx"
    product_path = OUT_DIR / "AgentHub_多Agent协作平台产品设计文档.docx"
    tech_path = OUT_DIR / "AgentHub_多Agent协作平台技术文档.docx"

    build_doc(overview_path, "AgentHub 项目交付总览", overview_markdown())
    build_doc(collaboration_path, "AgentHub——AI 协作开发记录", collaboration_record_markdown())
    build_doc(product_path, "AgentHub——多 Agent 协作平台产品设计文档", PRODUCT_MD.read_text(encoding="utf-8"))
    build_doc(tech_path, "AgentHub——多 Agent 协作平台技术文档", TECH_MD.read_text(encoding="utf-8"))

    for path in [overview_path, collaboration_path, product_path, tech_path]:
        size_kb = path.stat().st_size / 1024
        print(f"[PASS] {path} ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
