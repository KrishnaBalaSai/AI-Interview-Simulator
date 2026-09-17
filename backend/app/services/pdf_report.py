import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_pdf_report(
    candidate_name: str,
    target_role: str,
    interview_type: str,
    report_data: Dict[str, Any],
    timeline_events: List[Dict[str, Any]] = None,
) -> bytes:
    """
    Generates a professional PDF interview report using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e1b4b"), # indigo-950
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#4f46e5"), # indigo-600
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica-Bold",
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )
    bullet_style = ParagraphStyle(
        "BulletText",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=15,
    )

    elements = []

    # Title & Header
    elements.append(Paragraph("AI INTERVIEW SIMULATOR", subtitle_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("CANDIDATE PERFORMANCE REPORT", title_style))
    elements.append(Spacer(1, 6))

    # Candidate Meta Card Table
    created_date = report_data.get("created_at")
    if isinstance(created_date, datetime):
        date_str = created_date.strftime("%B %d, %Y - %H:%M")
    else:
        date_str = datetime.utcnow().strftime("%B %d, %Y")

    meta_data = [
        [
            Paragraph(f"<b>Candidate:</b> {candidate_name}", body_style),
            Paragraph(f"<b>Target Role:</b> {target_role}", body_style),
        ],
        [
            Paragraph(f"<b>Interview Type:</b> {interview_type}", body_style),
            Paragraph(f"<b>Evaluation Date:</b> {date_str}", body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # Scorecard Table
    elements.append(Paragraph("Performance Metrics", section_heading))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=8))

    overall = report_data.get("overall_score", 0.0)
    tech = report_data.get("technical_score", 0.0)
    comm = report_data.get("communication_score", 0.0)
    relevance = report_data.get("relevance_score", 0.0)
    comp = report_data.get("completeness_score", 0.0)

    score_data = [
        [
            Paragraph("<b>Overall Score</b>", body_style),
            Paragraph("<b>Technical Correctness</b>", body_style),
            Paragraph("<b>Communication</b>", body_style),
            Paragraph("<b>Relevance</b>", body_style),
            Paragraph("<b>Completeness</b>", body_style),
        ],
        [
            Paragraph(f"<font size=14 color='#4f46e5'><b>{overall}/10</b></font>", body_style),
            Paragraph(f"<font size=14 color='#0284c7'><b>{tech}/10</b></font>", body_style),
            Paragraph(f"<font size=14 color='#059669'><b>{comm}%</b></font>", body_style),
            Paragraph(f"<font size=14 color='#d97706'><b>{relevance}/10</b></font>", body_style),
            Paragraph(f"<font size=14 color='#7c3aed'><b>{comp}/10</b></font>", body_style),
        ],
    ]
    score_table = Table(score_data, colWidths=[104, 104, 104, 104, 104])
    score_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#c7d2fe")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    elements.append(score_table)
    elements.append(Spacer(1, 12))

    # AI Coach Evaluation Summary
    elements.append(Paragraph("AI Executive Summary", section_heading))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=6))
    ai_summary = report_data.get("ai_summary", "Evaluation complete.")
    elements.append(Paragraph(ai_summary, body_style))
    elements.append(Spacer(1, 10))

    # Strengths
    elements.append(Paragraph("Demonstrated Strengths", section_heading))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=6))
    for s in report_data.get("strengths", []):
        elements.append(Paragraph(f"• {s}", bullet_style))
    elements.append(Spacer(1, 10))

    # Weaknesses & Mistakes
    elements.append(Paragraph("Identified Gaps & Areas for Improvement", section_heading))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=6))
    weaknesses = report_data.get("weaknesses", []) + report_data.get("mistakes", [])
    if weaknesses:
        for w in weaknesses[:5]:
            elements.append(Paragraph(f"• {w}", bullet_style))
    else:
        elements.append(Paragraph("• No major technical deficiencies identified.", bullet_style))
    elements.append(Spacer(1, 10))

    # Recommended Topics
    elements.append(Paragraph("Recommended Topics for Practice", section_heading))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=6))
    for topic in report_data.get("recommended_topics", []):
        elements.append(Paragraph(f"• <b>{topic}</b>: Review core architecture and practice coding implementations.", bullet_style))
    elements.append(Spacer(1, 12))

    # Mistake Timeline Section if present
    if timeline_events:
        elements.append(Paragraph("Interview Mistake Timeline", section_heading))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=6))

        timeline_data = [
            [
                Paragraph("<b>Time</b>", body_style),
                Paragraph("<b>Topic</b>", body_style),
                Paragraph("<b>Score</b>", body_style),
                Paragraph("<b>Mistake / Feedback</b>", body_style),
            ]
        ]
        for ev in timeline_events:
            timeline_data.append([
                Paragraph(ev.get("timestamp_str", "00:00"), body_style),
                Paragraph(ev.get("topic", "General"), body_style),
                Paragraph(f"{ev.get('score', 0)}/10", body_style),
                Paragraph(f"{ev.get('mistake_summary', '')} <i>({ev.get('improvement_tip', '')})</i>", body_style),
            ])

        t_table = Table(timeline_data, colWidths=[55, 95, 55, 315])
        t_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fee2e2")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#fca5a5")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(t_table)

    # Footer note
    elements.append(Spacer(1, 20))
    footer_text = "Generated by AI Interview Simulator — Student: Srinivas Kandagatla | Batch: PFS-HYD-063"
    elements.append(Paragraph(f"<font size=8 color='#94a3b8'>{footer_text}</font>", subtitle_style))

    doc.build(elements)
    pdf_val = buffer.getvalue()
    buffer.close()
    return pdf_val
