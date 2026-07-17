# ULTRON Frontend Architecture

## Vision

The frontend is not a traditional chatbot.

ULTRON should feel like an AI Investigation Console.

The user should feel like they are watching an autonomous investigation happening in real time instead of waiting for an AI response.

The UI must remain minimal, aesthetic and clean.

Avoid unnecessary animations.

Avoid dashboard complexity.

Focus on transparency.

---

# Tech Stack

Framework

React

Build Tool

Vite

Styling

TailwindCSS

UI Components

shadcn/ui

Icons

Lucide React

Markdown Renderer

react-markdown

Syntax Highlighting

rehype-highlight

HTTP Client

Axios

Real-Time Communication

Server Sent Events (SSE)

Fallback

WebSocket

---

# Design Philosophy

Minimal

Dark Theme

Glassmorphism (optional)

Smooth transitions

No visual clutter

Everything important should be readable.

The frontend should never feel like a dashboard.

It should feel like ChatGPT mixed with an investigation console.

---

# Layout

--------------------------------------------------------

| Navbar |

--------------------------------------------------------

| Chat Area | Investigation Panel |

| | |

| User Messages | Live Investigation |

| Assistant | Current Task |

| Messages | URLs |

| | Timeline |

--------------------------------------------------------

| Input Box |

--------------------------------------------------------

The investigation panel remains visible during execution.

---

# Navigation

Top Left

ULTRON Logo

Top Right

Settings

Theme Toggle

Investigation History (optional)

---

# Main Components

## 1. Chat Component

Purpose

Primary interaction.

Contains

User Messages

Assistant Messages

Investigation Summary

Input Box

Button

Start Investigation

---

## 2. Investigation Panel

Purpose

Show backend progress.

The panel updates live.

Sections

Current Stage

Planner

Searching

URL Verification

Browser

Evidence Analysis

Gap Detection

Report Generation

Each stage should have

Waiting

Running

Completed

Failed

---

## 3. Live Search Queries

Display every generated search query.

Example

Searching

Tesla Battery IEEE Paper

Searching

Tesla Official Battery Documentation

Searching

Tesla Battery Manufacturing

These should appear immediately after planner execution.

---

## 4. URL Feed

Purpose

Display every approved URL.

Rejected URLs may be hidden behind a dropdown.

Each URL card

Domain

Title

Status

Visited

Verified

Rejected

Clicking URL

Opens original website in new tab.

---

## 5. Investigation Timeline

Chronological execution.

Example

10:01

Mission Planned

10:02

Generated Search Tasks

10:03

Searching Tavily

10:04

Verified URLs

10:05

Opening Browser

10:06

Extracted Evidence

10:07

Evaluating Confidence

10:08

Generating Report

Every backend event should immediately appear.

---

## 6. Knowledge Coverage

Simple progress bars.

Example

Coverage

Official Sources

█████████

Academic

██████

News

████████

Blogs

██

Shows investigation completeness.

---

## 7. Confidence

Large percentage.

Example

Confidence

91%

Below

Authority

Agreement

Coverage

Freshness

Contradictions

The numbers should update after every investigation loop.

---

## 8. Investigation Loop Indicator

If another search cycle starts

Display

Knowledge Gap Found

Searching Again...

This makes autonomy visible.

---

## 9. Final Report Button

When report is ready

Display

Open Report

Download Markdown

---

# Markdown Viewer

Clicking Open Report

Should open

Right Sliding Panel

Exactly like

Codex

Cursor

Antigravity

Panel

Markdown Renderer

Scrollable

Code Blocks

Tables

Bullet Lists

Images (optional)

Links

The user should never leave the page.

---

# Backend Integration

The frontend never performs AI logic.

It only visualizes backend state.

The backend continuously sends

Planner Output

Current Stage

Generated Queries

Verified URLs

Current Confidence

Knowledge Gaps

Timeline Events

Final Report

---

# Backend API

POST

/api/investigate

Body

{

"query":"Analyze Tesla battery system"

}

Returns

{

"investigation_id":"..."

}

---

GET

/api/investigation/{id}/stream

Returns

Live Events

Planner

Searching

Browser

Confidence

Timeline

Report Ready

Prefer SSE.

Fallback

WebSocket.

---

GET

/api/report/{id}

Returns

Markdown Report

---

# Live Events

Example

Planner

{

"type":"planner",

"task":"Searching IEEE Papers"

}

Search

{

"type":"search",

"query":"Tesla IEEE Battery"

}

Browser

{

"type":"browser",

"url":"https://..."

}

Confidence

{

"type":"confidence",

"value":87

}

Timeline

{

"type":"timeline",

"message":"Evidence merged."

}

Report

{

"type":"report",

"status":"completed"

}

---

# User Flow

User enters prompt

↓

Clicks Start Investigation

↓

Planner executes

↓

Search queries appear

↓

URLs appear

↓

Browser activity updates

↓

Confidence updates

↓

Timeline updates

↓

Knowledge gaps appear

↓

Loop continues if required

↓

Report generated

↓

User opens Markdown viewer

↓

Reads report

↓

Downloads report (optional)

---

# UI Principles

Never show a loading spinner alone.

Always show what ULTRON is currently doing.

Every backend action should have a frontend representation.

Transparency is the core feature.

The interface should make the user trust the investigation process.

---

# Future Scope

Investigation History

Share Investigation

Export PDF

Evidence Graph

Claim Verification

Multi-Investigation Tabs

Voice Investigation

Collaborative Investigations

These are optional and should not be implemented during the hackathon.

---

# Success Criteria

The frontend succeeds if a judge can understand what ULTRON is doing without asking a single question.

The frontend is not responsible for intelligence.

It is responsible for making the intelligence visible.