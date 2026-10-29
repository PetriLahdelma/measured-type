# Runner brief, 2×2, browser cells (A and C)

You are doing one task in one working directory. Input files are already
there. Save every output file there, and keep any scratch files you make
inside that directory too.

Tools available: Node with Playwright and Chromium. For your own scripts set
NODE_PATH=<PLAYWRIGHT_NODE_PATH> (it holds playwright only).

Rules:
- Use only the Read, Write, Edit, Glob, Grep and Bash tools.
- Do not install packages and do not download anything.
- Do not read files outside your working directory, except a skill folder
  your prompt names and the Playwright folder above.
- If your prompt names a skill folder, read its SKILL.md before you start and
  follow it; read its reference files and run its scripts as it directs.
- If your prompt says "Skill: none", do not read any SKILL.md anywhere.
- Never read anything under ~/.claude.
- Do not use the Skill tool.
- Do not mention any skill, its name or its rule IDs in the files you write;
  describe problems and fixes in your own words. (Graders are blind to which
  configuration produced a run.)
- End with a two-line summary.
