# Cue MVP

A Vite + React + Tailwind MVP for **Cue**, built around the latest PRD for a browser-based presentation co-pilot.

## What this version does

- Uses **React** with a proper Vite setup
- Uses **Tailwind CSS** for styling
- Uses **bullet points as the primary tracked input**
- Supports optional **PDF upload** so slides can stay visually identical
- Includes a **Demo Speech** mode with sample data
- Shows a **live transcript panel**
- Tracks **covered / current / pending** points
- Shows a fixed overlay with **Now**, **Next**, **Progress**, and a single hint
- Triggers subtle **flash / vibration alerts** with cooldown
- Supports **manual override** with a Next button
- Supports an **AI judge** mode for paraphrase-aware point matching
- Supports **browser microphone recognition** when available

## How to run

1. Run `npm install`
2. Add `OPENAI_API_KEY` to your environment if you want AI judge mode
3. Run `npm run dev`
4. Open the local URL shown by Vite

For the smoothest demo, use Chrome or Edge.

## Recommended demo flow

1. Enter one bullet per line
2. Upload a `.pdf` if you want the slides to remain visually identical
3. Start with `Demo Speech` to show tracking and hint recovery quickly
4. Switch matching to `AI judge` if you want paraphrase-aware decisions
5. Switch to `Live Microphone` for a real presentation test

## MVP notes

The next upgrade path is:

1. Improve matching from keyword-based to concept-based
2. Add automatic slide detection from transcript cues
3. Add a post-presentation summary screen
