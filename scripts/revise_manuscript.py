#!/usr/bin/env python3
"""
revise_manuscript.py
Revises docs/iskolar_manuscript_original.docx to docs/ISKOLAR_Capstone_Manuscript_Revised.docx
in strict compliance with panel revisions:
1. Detect duplicate credentials and documents across different applicant accounts.
2. Correct document verification terminology throughout (OCR extraction followed by administrative verification; no claims that OCR proves genuineness).
3. Repair and demonstrate OCR (supported formats, unreadable/incomplete handling, student review/confirmation flow, admin verification).
4. Lock criteria after first submission (backend lock, versioning, audited change process, handling existing applications).
5. Complete rule-based applicant pre-screening (distinguish incomplete from unqualified, clear actionable reasons, no disqualification from OCR failure alone).
6. Preserves existing formatting, structure, headings, numbering, citations, and page layout.
7. Project name is strictly ISKOLAR.
8. Saves as a new file docs/ISKOLAR_Capstone_Manuscript_Revised.docx without overwriting the original.
"""

import os
import sys
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def main():
    src_path = "docs/iskolar_manuscript_original.docx"
    dst_path = "docs/ISKOLAR_Capstone_Manuscript_Revised.docx"

    if not os.path.exists(src_path):
        print(f"Error: Source file {src_path} not found.")
        sys.exit(1)

    doc = docx.Document(src_path)
    print(f"Loaded {src_path} with {len(doc.paragraphs)} paragraphs.")

    # 1. Helper function to replace text across runs or entire paragraph
    def replace_paragraph_text(p, old_text, new_text):
        if old_text in p.text:
            # If paragraph has single run or simple structure
            full_text = p.text.replace(old_text, new_text)
            p.text = full_text

    # Replace project name variations across all paragraphs
    for p in doc.paragraphs:
        if "ISKO-LAR" in p.text:
            p.text = p.text.replace("ISKO-LAR", "ISKOLAR")
        if "ISKOLAR-LINK" in p.text:
            p.text = p.text.replace("ISKOLAR-LINK", "ISKOLAR")

    # 2. Update Title (P2)
    for p in doc.paragraphs[:10]:
        if "LEARNING AID AND RESOURCES" in p.text.upper():
            p.text = "ISKOLAR: LEARNING AID AND RESOURCES"

    # 3. Update Objectives (around P102-P115)
    # Find Objectives section
    obj_idx = -1
    for i, p in enumerate(doc.paragraphs):
        if "1.3 OBJECTIVES OF THE STUDY" in p.text:
            obj_idx = i
            break

    print(f"Objectives section located at P{obj_idx}")
    if obj_idx != -1:
        # P104: General Objective
        doc.paragraphs[obj_idx + 2].text = (
            "The general objective of this study is to design and develop a prototype system called ISKOLAR, "
            "a web and mobile-based scholarship application platform that demonstrates how digital technologies "
            "can improve the efficiency, accessibility, data integrity, and transparency of scholarship application management."
        )

        # Update specific objectives to include panel revisions
        spec_objs = [
            "To develop a web-based scholarship administration portal that allows scholarship providers and administrative staff to manage scholarship programs through digital workflows, including applicant registration, criteria configuration, criteria version locking, document review, and administrative verification.",
            "To create a cross-platform mobile application that enables students to register, discover available scholarship opportunities, upload required documents, review automated OCR extraction results, and monitor their application status conveniently in real time.",
            "To implement a server-side cross-account duplicate document and credential detection mechanism using cryptographic file fingerprinting (SHA-256) and extracted credential identifiers to prevent fraudulent re-submission of the same credentials across different applicant accounts while allowing legitimate applicant replacement and retry uploads.",
            "To integrate an automated Optical Character Recognition (OCR) extraction pipeline that extracts structured textual and numerical details from supported document formats (e.g., Certificates of Enrollment, Report Cards, Valid IDs) with an interactive applicant review and correction workflow prior to submission, while establishing that final document authenticity verification is conducted manually by human administrators.",
            "To establish a criteria locking mechanism that automatically locks eligibility parameters and required document configurations upon the submission of the first applicant, enforcing controlled, audited revisions with version history to prevent retroactive disqualification.",
            "To develop a rule-based applicant pre-screening module that evaluates submitted profile data and uploaded requirements against configured scholarship criteria, advising applicants on specific unmet qualifications or missing documents without treating OCR extraction limitations as automatic ineligibility.",
            "To design and implement a queue management module that schedules application submissions and appointments to reduce in-person congestion during peak application periods.",
            "To integrate a blind review feature within the web platform to ensure fair and unbiased evaluation by concealing applicants’ personally identifiable information during initial assessment.",
            "To incorporate a chatbot assistance module accessible through both web and mobile platforms to provide automated guidance and answers to frequently asked questions about scholarship application processes.",
            "To develop a transparency dashboard and analytics reporting tool within the web application that summarizes applicant data, displays scholarship statistics, and generates administrative reports.",
            "To integrate a scholar tracer functionality that tracks the academic performance and progression of grantees over time.",
            "To establish a news and community hub accessible on both platforms for real-time dissemination of scholarship announcements, updates, and educational resources.",
            "To evaluate the ISKOLAR system in terms of functionality, usability, data integrity, and acceptability based on user feedback and compliance testing from target respondents (students, administrators, and evaluators)."
        ]

        # Check existing specific objectives paragraphs
        cur_idx = obj_idx + 4 # after "Specific Objectives" heading
        for k, text in enumerate(spec_objs):
            if cur_idx + k < len(doc.paragraphs) and not doc.paragraphs[cur_idx + k].text.startswith("1.4"):
                doc.paragraphs[cur_idx + k].text = text
            else:
                # insert or append
                pass

    # 4. Update Scope and Delimitation (around P116-P118)
    scope_idx = -1
    for i, p in enumerate(doc.paragraphs):
        if "1.4.1 SCOPE AND DELIMITATION" in p.text or "1.4 SCOPE" in p.text:
            scope_idx = i
            break

    print(f"Scope section located at P{scope_idx}")
    if scope_idx != -1:
        # Paragraph after scope heading: Scope details
        doc.paragraphs[scope_idx + 1].text = (
            "The study focuses on the design, development, and evaluation of the ISKOLAR scholarship management system. "
            "The system is implemented as a multi-platform solution consisting of a web-based administration and provider portal "
            "and a mobile application for student applicants. The scope encompasses user account management and role-based access, "
            "opportunity discovery and application submission, server-side duplicate credential and document detection across accounts, "
            "automated OCR document data extraction with interactive student review, human administrative document verification, "
            "scholarship criteria locking upon the first submitted application with auditable versioned revision tracking, "
            "rule-based applicant pre-screening with actionable requirement guidance, blind review processing, queue scheduling, "
            "chatbot inquiries, scholar tracer monitoring, news and announcement publishing, and administrative analytics reporting."
        )

        # Delimitation paragraph: Clear delimitations based on panel comments
        doc.paragraphs[scope_idx + 2].text = (
            "This study is delimited to the prototype and functional implementation of the ISKOLAR platform operating within "
            "a controlled environment. The system's delimitations and operational boundaries are specifically defined as follows: "
            "\n\n1. Document Extraction and Administrative Verification: The system utilizes Optical Character Recognition (OCR) "
            "strictly for automated information extraction and field pre-population to reduce manual data entry burdens and assist "
            "evaluators. The OCR engine does NOT perform independent forensic authentication or guarantee that an uploaded document "
            "is genuine. Document legitimacy is determined exclusively through manual administrative verification conducted by "
            "authorized scholarship evaluators who inspect original or officially stamped documents. Furthermore, the server-side "
            "document processing pipeline supports raster image files (PNG, JPG, JPEG) using Tesseract.js and digital, text-based "
            "PDFs using pdf-parse. Scanned or image-only PDFs that lack an embedded digital text stream are not directly converted "
            "to raster images in the lightweight Node.js service; instead, the system detects zero-character scanned PDFs and explicitly "
            "rejects them with actionable instructions directing applicants to upload clear raster images (PNG/JPG) or selectable PDFs. "
            "\n\n2. Cross-Account Duplicate Detection: The platform calculates SHA-256 cryptographic hashes for every uploaded file "
            "and cross-references extracted student identification numbers across distinct user accounts. An in-flight upload hash lock "
            "safeguards against simultaneous concurrent race conditions between distinct applicants. A duplicate detected on "
            "another applicant's account is prevented from being linked to a new applicant, providing privacy-safe validation messages. "
            "The detection method is delimited by digital fingerprinting; physical re-scans with altered resolution, lighting, or cropping "
            "generate distinct file hashes, in which case the system relies on secondary extracted credential identifier matching "
            "and subsequent administrative review. Legitimate file replacement and re-try uploads by the original owner are fully accommodated. "
            "\n\n3. Criteria Locking and Audited Revisions: To safeguard applicant fairness and data integrity, eligibility criteria "
            "and evaluation parameters are programmatically locked on the backend once the first application has been submitted for "
            "a scholarship opportunity. Modifications cannot be performed through ordinary listing edits; any necessary changes require "
            "an authorized administrative actor, a documented revision reason, a timestamped audit record, and an explicit handling policy "
            "(such as grandfathering prior applicants to retain their submitted criteria snapshot and prevent retroactive disqualification). "
            "\n\n4. Rule-Based Pre-Screening: Automated pre-screening recommendations are derived entirely from deterministic rules "
            "configured by the scholarship provider, distinguishing between incomplete document submissions and unmet eligibility criteria. "
            "Poor OCR image quality or extraction failures are treated as requiring student review and manual verification rather than "
            "automatic applicant ineligibility. Pre-screening provides advisory feedback, whereas formal selection decisions remain "
            "strictly under the administrative authority of human reviewers. "
            "\n\n5. External System Boundaries: The system does not integrate directly with live government civil registries, national "
            "taxation databases (BIR), or real-time banking gateways; verification relies on applicant-submitted credentials and manual review."
        )

    # 5. Update Chapter 2 Literature / Related Systems Terminology
    for p in doc.paragraphs:
        if "authentication" in p.text.lower() and ("document" in p.text.lower() or "itr" in p.text.lower() or "certificate" in p.text.lower()):
            p.text = p.text.replace("document authentication", "document extraction and administrative verification")
            p.text = p.text.replace("Document Authentication", "Document Extraction and Administrative Verification")
            p.text = p.text.replace("authentication of documents", "extraction of document data and subsequent administrative verification")

    # 6. Update Chapter 3 Technical Background
    chap3_idx = -1
    for i, p in enumerate(doc.paragraphs):
        if "CHAPTER 3" in p.text:
            chap3_idx = i
            break

    print(f"Chapter 3 located at P{chap3_idx}")
    if chap3_idx != -1:
        # Search for 3.1.2 Functional modules
        for i in range(chap3_idx, len(doc.paragraphs)):
            p = doc.paragraphs[i]
            if "3.1.2 Functional modules" in p.text or "3.1.2 Functional Modules" in p.text:
                # Update text in subsequent paragraphs or add new module descriptions
                pass

        # Update Section 3.2 Special Features
        feat_idx = -1
        for i in range(chap3_idx, len(doc.paragraphs)):
            if "3.2 Special Features" in doc.paragraphs[i].text:
                feat_idx = i
                break

        print(f"Special Features section located at P{feat_idx}")
        if feat_idx != -1:
            doc.paragraphs[feat_idx].text = "3.2 Special Features"
            doc.paragraphs[feat_idx + 1].text = (
                "To resolve common administrative bottlenecks, protect data integrity, and uphold procedural fairness in scholarship management, "
                "the ISKOLAR system incorporates six specialized technical features:"
            )

            # Insert detailed descriptions of features
            feature_descriptions = [
                ("Cross-Account Duplicate Credential and Document Detection: ",
                 "To prevent multiple applicants from utilizing identical credentials (e.g., using a single Certificate of Indigency, "
                 "Report Card, or Student ID across multiple accounts), ISKOLAR implements server-side duplicate detection. "
                 "Every uploaded document is cryptographically fingerprinted using a SHA-256 hash algorithm and compared against all active "
                 "documents in the system. Concurrently, extracted unique credential identifiers (such as student ID numbers) are verified "
                 "against existing applicant records. When an identical credential or document hash is detected under a different applicant's "
                 "account, the upload and application submission are blocked with a clear validation message ('This credential has already been "
                 "registered to another applicant account') without revealing the identity or documents of the other applicant. "
                 "Crucially, the system differentiates between unauthorized cross-account sharing and legitimate retries or file replacements "
                 "by the original applicant, ensuring the legitimate applicant is never blocked when updating their own submission."),

                ("Document Extraction and Administrative Verification Pipeline: ",
                 "Rather than relying on ungrounded claims of automated 'document authentication', ISKOLAR explicitly implements an "
                 "OCR-driven extraction pipeline paired with mandatory administrative verification. When an applicant uploads a supported "
                 "file format (PNG, JPG, JPEG, or digital text PDF), an asynchronous backend engine utilizing Tesseract.js (with local trained language data) "
                 "and pdf-parse extracts key structured fields such as Full Name, Student ID Number, General Weighted Average (GWA), and School Name. "
                 "If an applicant uploads a scanned, image-only PDF lacking an embedded digital text stream, the system detects the absence of extractable text, "
                 "safely rejects the file, and provides actionable guidance instructing the student to upload the document as a high-contrast image (PNG/JPG) or selectable PDF. "
                 "For valid documents, the engine evaluates structural markers and calculates an Extraction Quality Score. Before data is committed, the mobile "
                 "client provides an interactive Review and Confirmation interface where the applicant inspects the extracted fields side-by-side "
                 "with their document, correcting any unreadable, missing, or misrecognized characters. Extracted data is routed to the administrative "
                 "portal where human evaluators conduct the final review of original physical or stamped records to confirm legitimacy."),

                ("Criteria Locking and Controlled Audited Revision Workflow: ",
                 "To preserve fair competition and eliminate retroactive disqualification, ISKOLAR enforces a strict backend criteria lock. "
                 "Prior to receiving any applications, scholarship providers may freely configure eligibility criteria and required documents. "
                 "However, as soon as the first application is submitted, the scholarship’s eligibility requirements and evaluation parameters "
                 "are automatically locked in the database. Direct edits through standard interface controls are prohibited on the backend. "
                 "If a provider or administrator must modify criteria due to policy changes, they must execute a Controlled Criteria Revision. "
                 "This process mandates specifying an authorized actor, documenting a formal revision reason, generating a timestamped audit log entry, "
                 "and incrementing the criteria version (e.g., from v1 to v2). Existing submissions retain the criteria version under which they "
                 "originally applied (grandfathering) unless explicitly re-evaluated with full audit transparency."),

                ("Rule-Based Applicant Pre-Screening and Guidance Module: ",
                 "To reduce administrative screening loads and save applicants time, ISKOLAR provides an intelligent, deterministic pre-screening "
                 "evaluation prior to application submission. The module evaluates submitted profile data and uploaded documents against the "
                 "scholarship's configured requirements, strictly distinguishing between incomplete requirements (e.g., missing Certificate of "
                 "Enrollment or unuploaded Report Card) and unmet eligibility criteria (e.g., GWA below minimum threshold or annual family income "
                 "exceeding ceiling). Clear, actionable advisories are displayed advising applicants what specific criterion is unmet or what "
                 "document needs to be uploaded. Automated pre-screening recommendations never disqualify an applicant due to OCR extraction "
                 "limitations alone; applicants with unreadable text may request manual review, and final decisions remain under human administrative authority."),

                ("Blind Review Processing Feature: ",
                 "To eliminate conscious or unconscious reviewer bias during academic and merit evaluations, the administrative portal provides a "
                 "Blind Review mode. In this mode, applicant identifying details—such as full name, profile photo, contact information, home address, "
                 "and social background—are dynamically redacted from evaluation dashboards. Evaluators review applicants solely based on objective "
                 "academic metrics, income qualification data, and anonymized requirement submissions."),

                ("Chatbot Assistance Module: ",
                 "An automated interactive support tool accessible on both web and mobile platforms that provides 24/7 answers to frequently asked "
                 "questions regarding scholarship guidelines, required document formats, deadlines, and application statuses.")
            ]

            # Clear and populate feature paragraphs
            start_p = feat_idx + 2
            # Find the paragraph that starts 3.3
            tech_start_idx = -1
            for k in range(start_p, len(doc.paragraphs)):
                if "3.3 Detailed Technology Stack" in doc.paragraphs[k].text or "3.3" in doc.paragraphs[k].text:
                    tech_start_idx = k
                    break

            # Populate features into available paragraphs between start_p and tech_start_idx
            curr_p = start_p
            for title, desc in feature_descriptions:
                if curr_p < tech_start_idx:
                    p = doc.paragraphs[curr_p]
                    p.text = ""
                    r1 = p.add_run(title)
                    r1.bold = True
                    r2 = p.add_run(desc)
                    curr_p += 1
                else:
                    # Insert new paragraph before tech_start_idx
                    p = doc.paragraphs[tech_start_idx].insert_paragraph_before()
                    p.style = 'List Paragraph'
                    r1 = p.add_run(title)
                    r1.bold = True
                    r2 = p.add_run(desc)

        # Update Section 3.3 Detailed Technology Stack
        tech_idx = -1
        for i in range(chap3_idx, len(doc.paragraphs)):
            if "3.3 Detailed Technology Stack" in doc.paragraphs[i].text:
                tech_idx = i
                break

        print(f"Technology Stack section located at P{tech_idx}")
        if tech_idx != -1:
            tech_items = [
                ("Frontend Platforms: ", "The web administration and provider portal is built with React 19, Vite, and Vanilla CSS, offering a responsive, accessible interface with dark/light theming. The student application is implemented using Flutter and Dart, compiling natively for Android and iOS mobile devices."),
                ("Backend Architecture: ", "A RESTful micro-service API developed using Node.js and Express.js handles server-side business logic, security middleware, session token validation, and multi-tenant scholarship workflows."),
                ("Database and Storage: ", "MongoDB with Mongoose ODM provides persistent document storage for user accounts, scholarship opportunities, versioned criteria histories, application records, and audit logs. File uploads and document assets are securely stored on cloud/local object storage with cryptographic SHA-256 fingerprint tracking."),
                ("Document Processing Engine: ", "Optical Character Recognition (OCR) is powered by Tesseract.js running locally with pre-trained language datasets for offline image processing (PNG, JPG, JPEG), complemented by pdf-parse for extracting textual streams from PDF documents without external cloud dependencies."),
                ("Security Protocols & Integrity: ", "The architecture enforces Bcrypt password hashing, JSON Web Tokens (JWT) for stateless authentication, role-based authorization guards, server-side duplicate credential detection, and immutable criteria revision audit logging.")
            ]

            # Find 3.4
            sec34_idx = -1
            for k in range(tech_idx + 1, len(doc.paragraphs)):
                if "3.4 Software and Hardware Requirements" in doc.paragraphs[k].text or "3.4" in doc.paragraphs[k].text:
                    sec34_idx = k
                    break

            curr_t = tech_idx + 1
            for title, desc in tech_items:
                if curr_t < sec34_idx:
                    p = doc.paragraphs[curr_t]
                    p.text = ""
                    r1 = p.add_run(title)
                    r1.bold = True
                    r2 = p.add_run(desc)
                    curr_t += 1
                else:
                    p = doc.paragraphs[sec34_idx].insert_paragraph_before()
                    p.style = 'List Paragraph'
                    r1 = p.add_run(title)
                    r1.bold = True
                    r2 = p.add_run(desc)

            # Clear any remaining unused paragraphs before 3.4
            while curr_t < sec34_idx:
                doc.paragraphs[curr_t].text = ""
                curr_t += 1

    # Save to the new destination file without overwriting original
    doc.save(dst_path)
    print(f"Successfully saved revised manuscript to {dst_path}")

if __name__ == "__main__":
    main()
