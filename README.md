# GBI Genome Atlas

The atlas is one self-contained web page covering 218 rare and endangered
California plant genomes. This repository holds everything needed to rebuild
and republish it. Nothing else is required: no server, no Google account, no
software on anyone's computer.

Live page: https://ORG.github.io/genome-atlas/


## How to change something

The master spreadsheet lives in Google Drive and stays there. It is not copied
into this repository, so there is only ever one version of it.

1. Open the master spreadsheet in Drive and edit the cell you want to change.
2. In this repository go to **Actions**, choose **Build and publish atlas**,
   and press **Run workflow**.
3. About two to three minutes later the live page is updated. A green tick in
   the Actions tab means it worked.

If something is wrong with the edit, the Actions tab shows a red cross, GitHub
emails whoever committed, and the message names the problem. **The live page is
not affected by a failed build.** It keeps showing the last version that built
cleanly, so a mistake is never visible to the public.

There is also a Run workflow button under Actions if you ever need to rebuild
without changing anything.


## What you can change from the spreadsheet

Everything below is a cell in the workbook. None of it requires touching code.

**The plants themselves**, on the `RESULTS` tab. All 218 records: scientific and
common names, family and genus, CNPS rarity rank, accession numbers and their
links, BioProject, the collecting institution and locality, bloom months,
genome size, N50, gene counts, and which pipeline stages each plant reached.
Filling in an accession as it arrives from GenBank is a cell edit.

**The three matrices**, on their own tabs. `BUSCO GENE LIST v2`,
`BARCODE PRIMER LIST v2` and `TF BY FAMILY v2` drive the three matrix pages.

**All the words**, on the `ATLAS Copy` tab. 167 strings: every heading, caption,
callout, footnote, the status messages in the plant drawer, the enzyme-family
descriptions on Chemistry, the rarity rank descriptions, and the long
interpretive notes on the plastome plates. Edit the `text` column and leave the
`key` column alone.

Some of those strings have placeholders in braces, like `{max}` or `{n}`. The
build fills those in with live figures. Rewrite the sentence around them freely,
but keep the braces or the numbers disappear.

**Every published figure the atlas compares itself against**, on the
`ATLAS Comparisons` tab, with its source, link and the date it was looked up.
Each figure is written once here and used everywhere it appears, so the page
cannot contradict itself.

**The transcription factor reference counts**, on `ATLAS Regulators`.

**Contact email, embargo count and release date, and the image licence**, on
`ATLAS Settings`.


## What you cannot change from the spreadsheet

**The Chemistry, Markers and Plastomes pages.** These are built from three
finished analysis payloads in `build/chem`, `build/ssr` and `build/cp2`, not
from the workbook. The per-plant values also appear in the workbook, on
`CHEMISTRY v2`, `SSR PANEL v2` and `CHLOROPLAST_v2`, but the atlas does not read
those tabs. Editing them changes nothing. Those three analyses are finished and
were not expected to change again; redoing them means re-running the pipelines.

**Any figure computed from the plants.** The five tiles across the top of the
Overview, the rarity breakdown, the pipeline funnel, every count in the
navigation. These are counted from the 218 records every time the page is built.
That is deliberate: it means the summary can never disagree with the data
underneath it. To change them, change the plants.

**Layout, colour, chart types, the scrolling images, anything interactive.**
Those live in the code under `build/`.

**Adding a whole new page to the atlas.** That is a code change.

**The 182 chloroplast plate images.** They are individual files in
`build/cpimg2`, one per plant. To replace one, upload a new `.webp` under the
same name. To add or remove a plant's plate, add or delete the file. The build
picks up whatever is in that folder.


## What the build will catch, and what it will not

Caught, with the build stopping and naming the problem:

- Deleting a row from `ATLAS Copy` that the atlas uses.
- Adding a row whose key nothing reads, so you do not sit editing a cell that
  does nothing.
- Inserting or deleting a column on `RESULTS`. There are 29 checks on that tab
  because it is read by column position. This has gone wrong once before.
- Renaming or removing one of the tabs.

Safe, and tested:

- Sorting or reordering rows on any `ATLAS` tab. They are looked up by key.
- Adding comments or extra columns to the right.

**Not caught:** broken HTML inside a copy cell. The text may contain `<b>`,
`<em>` and links, and an unclosed tag will render wrong without failing the
build. If a page looks mangled after an edit, that is the first thing to check.

Also not an error: deleting a plant row. The plant simply disappears from the
atlas. That is by design, but it is quiet, so be deliberate about it.


## Where everything lives

    (the master spreadsheet)             in Google Drive, not in this repo
    build/                               the build. Not edited in normal use.
      build_data.py                      reads the workbook, writes bundle.json
      assemble.py                        combines everything into one page
      tpl_*.html, js1..js9.js            the page itself
      cpimg2/                            182 chloroplast plate images, one each
      chem/, ssr/, cp2/                  the three finished analysis payloads
    .github/workflows/build.yml          what runs on each commit

The built page is never stored in this repository. It is handed straight to
GitHub Pages, so the repository does not grow by 14 MB every time someone fixes
a typo.


## Limits worth knowing

- The repository must stay public. GitHub Pages is free only for public
  repositories, and the atlas is meant to be public anyway.
- The spreadsheet must stay shared as "Anyone with the link can view" and must
  not be moved to a different file. The build downloads it from Drive on every
  run. If sharing is tightened or the file is replaced with a new one, every
  rebuild fails with a clear message until it is restored or SHEET_ID is
  updated.
- GitHub Actions is free and unmetered on public repositories.
- GitHub Pages allows a 1 GB site and roughly 100 GB of traffic a month.
- The photographs and range maps are loaded live from Calflora rather than
  stored here, under CC BY-NC 4.0 with each photographer credited. If Calflora
  ever restructures its image addresses, those pictures will stop appearing.
  Nothing about this repository changes that.


## Rebuilding on your own computer

You should not need to, but if you want to:

    pip install openpyxl
    curl -L "https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=xlsx" -o workbook.xlsx
    cd build
    GBI_WORKBOOK=../workbook.xlsx python3 build_data.py
    python3 assemble.py cpimg2 ../site/index.html

Python 3 and openpyxl are the only requirements.


## Where the spreadsheet address is configured

The workflow finds the spreadsheet through a repository variable called
`SHEET_ID`, under Settings, then Secrets and variables, then Actions, then the
Variables tab. Its value is the long identifier in the spreadsheet's web
address, the part between `/d/` and `/edit`.

That is the only place the address is written down. If the master spreadsheet is
ever replaced by a different file, change this one value and nothing else.
