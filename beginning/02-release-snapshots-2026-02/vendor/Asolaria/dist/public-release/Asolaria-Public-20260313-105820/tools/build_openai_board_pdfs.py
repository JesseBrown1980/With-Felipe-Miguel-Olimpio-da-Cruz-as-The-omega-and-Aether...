from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "BoardTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=27,
            textColor=colors.HexColor("#162330"),
            spaceAfter=16,
        ),
        "h1": ParagraphStyle(
            "BoardH1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#162330"),
            spaceBefore=10,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "BoardH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#a54725"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "BoardBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1b1b1b"),
            spaceAfter=8,
        ),
        "meta": ParagraphStyle(
            "BoardMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#5e554d"),
            spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "BoardBullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=13.5,
            leftIndent=0,
            textColor=colors.HexColor("#1b1b1b"),
            spaceAfter=2,
        ),
        "slide_eyebrow": ParagraphStyle(
            "SlideEyebrow",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#c98f26"),
            spaceAfter=10,
        ),
        "slide_title": ParagraphStyle(
            "SlideTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=31,
            textColor=colors.white,
            spaceAfter=16,
        ),
        "slide_title_light": ParagraphStyle(
            "SlideTitleLight",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=colors.HexColor("#13110f"),
            spaceAfter=14,
        ),
        "slide_body": ParagraphStyle(
            "SlideBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=colors.white,
            spaceAfter=8,
        ),
        "slide_body_light": ParagraphStyle(
            "SlideBodyLight",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#13110f"),
            spaceAfter=8,
        ),
    }


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def inline_code_markup(text: str) -> str:
    parts = []
    toggle = False
    for part in text.split("`"):
        if toggle:
            parts.append(f"<font face='Courier'>{escape_html(part)}</font>")
        else:
            parts.append(escape_html(part))
        toggle = not toggle
    return "".join(parts)


def parse_markdown_to_story(path: Path, styles):
    lines = path.read_text(encoding="utf-8").splitlines()
    story = []
    pending_bullets = []

    def flush_bullets():
        nonlocal pending_bullets
        if not pending_bullets:
            return
        items = [
            ListItem(Paragraph(inline_code_markup(item), styles["bullet"]))
            for item in pending_bullets
        ]
        story.append(
            ListFlowable(
                items,
                bulletType="bullet",
                leftIndent=18,
                bulletFontName="Helvetica",
                bulletFontSize=8,
            )
        )
        story.append(Spacer(1, 8))
        pending_bullets = []

    saw_title = False
    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            flush_bullets()
            continue
        if stripped.startswith("```"):
            flush_bullets()
            continue
        if stripped.startswith("- "):
            pending_bullets.append(stripped[2:].strip())
            continue

        flush_bullets()

        if stripped.startswith("# "):
            if saw_title:
                story.append(PageBreak())
            story.append(Paragraph(inline_code_markup(stripped[2:].strip()), styles["title"]))
            saw_title = True
            continue
        if stripped.startswith("## "):
            story.append(Paragraph(inline_code_markup(stripped[3:].strip()), styles["h1"]))
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(inline_code_markup(stripped[4:].strip()), styles["h2"]))
            continue
        if ":" in stripped and stripped.split(":", 1)[0].lower() in {"date", "audience", "status", "scope", "companion artifact", "sensitivity"}:
            story.append(Paragraph(inline_code_markup(stripped), styles["meta"]))
            continue
        story.append(Paragraph(inline_code_markup(stripped), styles["body"]))

    flush_bullets()
    return story


def build_text_pdf(source_path: Path, output_path: Path, styles):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.72 * inch,
        rightMargin=0.72 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.72 * inch,
        title=source_path.stem,
        author="Codex",
    )
    story = parse_markdown_to_story(source_path, styles)
    doc.build(story)


SLIDES = [
    {
        "dark": True,
        "eyebrow": "OpenAI Board Review / March 9, 2026",
        "title": "Asolaria is what a frontier-model operating substrate already looks like in the wild.",
        "body": [
            "Not a chatbot shell. Not a single agent.",
            "A governed local-first control plane with Codex, Symphony, remote MCP, graph telemetry, memory, mistakes, desktop action, phone action, and relay-backed multi-machine coordination.",
        ],
    },
    {
        "dark": False,
        "eyebrow": "The Core Claim",
        "title": "The interesting artifact is not the interface. It is the operating spine.",
        "body": [
            "What is already integrated:",
            "- Codex in the primary provider chain",
            "- Symphony as a managed long-running sidecar",
            "- Remote MCP used as compact integration fabric",
            "- Desktop, browser, voice, and phone lanes",
            "- Persistent project, memory, and mistake stores",
            "- Graph runtime with typed events and action manifests",
        ],
    },
    {
        "dark": False,
        "eyebrow": "Live Surface Area",
        "title": "This is already a substantial operational system.",
        "body": [
            "40 connector modules",
            "53 indexed skills",
            "32 indexed tool actions",
            "5 tracked project scopes",
            "Worker lanes: local_codex, abacus, symphony",
        ],
    },
    {
        "dark": True,
        "eyebrow": "Governance",
        "title": "The system treats tool use as governed infrastructure.",
        "body": [
            "- explicit authority modes",
            "- two-step authority transitions with rollback",
            "- approval-bound tool execution",
            "- readiness drills",
            "- audit verification that can lock writes on failure",
        ],
    },
    {
        "dark": False,
        "eyebrow": "OpenAI-Native Lanes",
        "title": "Codex, Symphony, Linear, and voice are already operating lanes.",
        "body": [
            "- Codex anchors the provider chain and the highest-trust local engineering lane",
            "- Symphony is repo-aware, workflow-aware, and Windows-aware",
            "- Linear is part of issue pickup and workflow routing",
            "- Voice defaults to gpt-4o-mini-transcribe",
        ],
    },
    {
        "dark": False,
        "eyebrow": "Cloud and Context",
        "title": "GCP, Vertex, NotebookLM, and Augment are integrated with restraint.",
        "body": [
            "- service-account backed GCP with allowed-project enforcement",
            "- Vertex daily request and token budgets",
            "- NotebookLM-ready cloud posture",
            "- Augment/Auggie as a read-only codebase-retrieval sidecar",
        ],
    },
    {
        "dark": True,
        "eyebrow": "Actuation",
        "title": "This system already reaches beyond software-only agency.",
        "body": [
            "- desktop capture, control, and display",
            "- browser and WebMCP workflows",
            "- phone mirror, browser history, developer options, and recovery lanes",
            "- operator-assist paths such as AnyDesk monitoring",
        ],
    },
    {
        "dark": False,
        "eyebrow": "Graph Layer",
        "title": "The graph runtime is live now, and the GNN posture is mature because it is honest.",
        "body": [
            "- typed graph events and action manifests",
            "- edge-risk scoring at event build time",
            "- graph-runtime training dataset export",
            "- no evidence of GNN inference in the hot path yet",
            "- policy and approvals remain the root of trust",
        ],
    },
    {
        "dark": False,
        "eyebrow": "Multi-Machine Fabric",
        "title": "The system scales outward through relay, watchdog, and bootstrap patterns.",
        "body": [
            "- room-based relay with auth, allowlists, and sender tokens",
            "- watchdog restart and identity enforcement",
            "- cross-host bootstrap materials for new workstations",
            "- friend-machine path that can adapt the control plane onto another Mac or PC",
        ],
    },
    {
        "dark": True,
        "eyebrow": "Board Takeaway",
        "title": "The next important layer is not a better prompt box.",
        "body": [
            "It is the governed operating system around frontier models.",
            "Asolaria shows the shape: Codex, Symphony, remote MCP, graph telemetry, authority, memory, mistakes, and actuation in one auditable fabric.",
        ],
    },
]


def build_deck_pdf(output_path: Path, styles):
    page_size = landscape(letter)
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=page_size,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.5 * inch,
        title="Asolaria OpenAI Board Deck",
        author="Codex",
    )

    story = []
    for index, slide in enumerate(SLIDES):
        dark = slide["dark"]
        title_style = styles["slide_title"] if dark else styles["slide_title_light"]
        body_style = styles["slide_body"] if dark else styles["slide_body_light"]
        story.append(Paragraph(escape_html(slide["eyebrow"]), styles["slide_eyebrow"]))
        story.append(Paragraph(escape_html(slide["title"]), title_style))
        story.append(Spacer(1, 0.1 * inch))
        bullet_buffer = []
        for raw in slide["body"]:
            text = str(raw).strip()
            if text.startswith("- "):
                bullet_buffer.append(text[2:].strip())
                continue
            if bullet_buffer:
                items = [ListItem(Paragraph(escape_html(item), body_style)) for item in bullet_buffer]
                story.append(ListFlowable(items, bulletType="bullet", leftIndent=18))
                story.append(Spacer(1, 0.14 * inch))
                bullet_buffer = []
            story.append(Paragraph(escape_html(text), body_style))
            story.append(Spacer(1, 0.12 * inch))
        if bullet_buffer:
            items = [ListItem(Paragraph(escape_html(item), body_style)) for item in bullet_buffer]
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=18))
        if index < len(SLIDES) - 1:
            story.append(PageBreak())

    def paint_background(canvas, doc_obj):
        page_number = canvas.getPageNumber()
        slide = SLIDES[page_number - 1]
        width, height = page_size
        if slide["dark"]:
            canvas.setFillColor(colors.HexColor("#162330"))
            canvas.rect(0, 0, width, height, fill=1, stroke=0)
            canvas.setFillColor(colors.HexColor("#203548"))
            canvas.circle(width - 90, height - 90, 110, fill=1, stroke=0)
        else:
            canvas.setFillColor(colors.HexColor("#f6f0e7"))
            canvas.rect(0, 0, width, height, fill=1, stroke=0)
            canvas.setFillColor(colors.HexColor("#efe6d9"))
            canvas.circle(width - 70, height - 90, 110, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#c98f26"))
        canvas.setLineWidth(2)
        canvas.line(32, height - 28, width - 32, height - 28)

    doc.build(story, onFirstPage=paint_background, onLaterPages=paint_background)


def main():
    styles = build_styles()
    targets = [
        (
            REPORTS / "john-cumbers-openai-board-cover-letter-20260309.md",
            REPORTS / "john-cumbers-openai-board-cover-letter-20260309.pdf",
        ),
        (
            REPORTS / "asolaria-openai-board-memo-20260309.md",
            REPORTS / "asolaria-openai-board-memo-20260309.pdf",
        ),
        (
            REPORTS / "asolaria-openai-board-system-card-20260309.md",
            REPORTS / "asolaria-openai-board-system-card-20260309.pdf",
        ),
        (
            REPORTS / "asolaria-openai-board-system-card-cited-20260309.md",
            REPORTS / "asolaria-openai-board-system-card-cited-20260309.pdf",
        ),
    ]
    for source_path, output_path in targets:
        build_text_pdf(source_path, output_path, styles)
    build_deck_pdf(REPORTS / "asolaria-openai-board-deck-20260309.pdf", styles)
    print("ok")


if __name__ == "__main__":
    main()
