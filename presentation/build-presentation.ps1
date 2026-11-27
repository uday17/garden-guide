# Builds GrowWell-Intern-Presentation.xlsx without needing Excel, Python or Node.
# An .xlsx file is a ZIP of XML parts; we create those parts directly.

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$outPath = Join-Path $PSScriptRoot "GrowWell-Intern-Presentation.xlsx"

function Esc([string]$s) {
  if ([string]::IsNullOrEmpty($s)) { return "" }
  return [System.Security.SecurityElement]::Escape($s)
}

function Add-ZipEntry($zip, [string]$name, [string]$content) {
  $entry = $zip.CreateEntry($name)
  $stream = $entry.Open()
  $writer = New-Object System.IO.StreamWriter($stream, (New-Object System.Text.UTF8Encoding($false)))
  $writer.Write($content)
  $writer.Dispose()
}

function RowHeight([string]$text, [int]$min = 28) {
  $len = if ($text) { $text.Length } else { 0 }
  $lines = [math]::Ceiling($len / 78)
  return [math]::Max($min, ($lines * 18 + 16))
}

function New-SheetXml($slide) {
  $rows = @()
  $merges = @()

  # Title (rows 1-3), subtitle (row 4), spacer (row 5)
  $rows += '<row r="1" ht="30" customHeight="1"><c r="A1" s="2" t="inlineStr"><is><t>' + (Esc $slide.Title) + '</t></is></c></row>'
  $rows += '<row r="2" ht="30" customHeight="1"/>'
  $rows += '<row r="3" ht="30" customHeight="1"/>'
  $rows += '<row r="4" ht="26" customHeight="1"><c r="A4" s="3" t="inlineStr"><is><t>' + (Esc $slide.Subtitle) + '</t></is></c></row>'
  $rows += '<row r="5" ht="12" customHeight="1"/>'
  $merges += "A1:H3"
  $merges += "A4:H4"

  $r = 6
  foreach ($item in $slide.Rows) {
    if ($item.Type -eq 'header') {
      $h = 30
      $rows += '<row r="' + $r + '" ht="' + $h + '" customHeight="1"><c r="A' + $r + '" s="4" t="inlineStr"><is><t>' + (Esc $item.Text) + '</t></is></c></row>'
      $merges += "A$r`:H$r"
    } elseif ($item.Type -eq 'split') {
      $h = RowHeight $item.Text
      $rows += '<row r="' + $r + '" ht="' + $h + '" customHeight="1"><c r="A' + $r + '" s="6" t="inlineStr"><is><t>' + (Esc $item.Label) + '</t></is></c><c r="C' + $r + '" s="5" t="inlineStr"><is><t>' + (Esc $item.Text) + '</t></is></c></row>'
      $merges += "A$r`:B$r"
      $merges += "C$r`:H$r"
    } else {
      $h = RowHeight $item.Text
      $rows += '<row r="' + $r + '" ht="' + $h + '" customHeight="1"><c r="A' + $r + '" s="5" t="inlineStr"><is><t>' + (Esc $item.Text) + '</t></is></c></row>'
      $merges += "A$r`:H$r"
    }
    $r++
  }

  # Footer
  $footerRow = 29
  $rows += '<row r="28" ht="10" customHeight="1"/>'
  $rows += '<row r="29" ht="24" customHeight="1"><c r="A29" s="7" t="inlineStr"><is><t>' + (Esc $slide.Footer) + '</t></is></c></row>'
  $merges += "A29:H29"

  $mergeXml = ""
  if ($merges.Count -gt 0) {
    $mergeNodes = ($merges | ForEach-Object { '<mergeCell ref="' + $_ + '"/>' }) -join ""
    $mergeXml = '<mergeCells count="' + $merges.Count + '">' + $mergeNodes + '</mergeCells>'
  }

  $cols = '<col min="1" max="1" width="12" customWidth="1"/>' +
          '<col min="2" max="2" width="14" customWidth="1"/>' +
          '<col min="3" max="3" width="14" customWidth="1"/>' +
          '<col min="4" max="4" width="14" customWidth="1"/>' +
          '<col min="5" max="5" width="14" customWidth="1"/>' +
          '<col min="6" max="6" width="14" customWidth="1"/>' +
          '<col min="7" max="7" width="14" customWidth="1"/>' +
          '<col min="8" max="8" width="14" customWidth="1"/>'

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    '<dimension ref="A1:H29"/>' +
    '<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    '<cols>' + $cols + '</cols>' +
    '<sheetData>' + ($rows -join "") + '</sheetData>' +
    $mergeXml +
    '<printOptions horizontalCentered="1"/>' +
    '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>' +
    '</worksheet>'
}

# ---------------- Slides ----------------
$slides = @()

$slides += @{
  Name = "01 Title"
  Title = "GrowWell - Intern Orientation"
  Subtitle = "Gardening handbook + interactive garden lab"
  Rows = @(
    @{ Type='header'; Text='What you will see today' },
    @{ Type='split'; Label='01'; Text='The product: a free, practical gardening handbook for beginners.' },
    @{ Type='split'; Label='02'; Text='The visual system: a dark jungle theme built from a reference image.' },
    @{ Type='split'; Label='03'; Text='The interactive part: a garden simulation using real plant and soil data.' },
    @{ Type='split'; Label='04'; Text='How it is built: plain HTML, CSS and JavaScript - no framework or build step.' }
  )
  Footer = "Live site: https://uday17.github.io/garden-guide/"
}

$slides += @{
  Name = "02 Product"
  Title = "01 - The product"
  Subtitle = "Who it helps and what it covers"
  Rows = @(
    @{ Type='header'; Text='Audience' },
    @{ Type='split'; Label='Beginners'; Text='Start with one windowsill pot; no experience or special tools needed.' },
    @{ Type='split'; Label='Improving'; Text='Soil, watering, light, plant selection and seasonal care.' },
    @{ Type='split'; Label='Advanced'; Text='Propagation, pruning, pest management and composting systems.' },
    @{ Type='header'; Text='Pages' },
    @{ Type='split'; Label='7 guides'; Text='Basics, Soil, Plant Library, Care, Advanced, Planner and India by State.' },
    @{ Type='split'; Label='Extras'; Text='Garden Lab game, a friendly 404 page and print-friendly styles.' }
  )
  Footer = "Everything is written for real spaces, real climates and real schedules."
}

$slides += @{
  Name = "03 Visual direction"
  Title = "02 - Visual direction"
  Subtitle = "From a reference image to a live design"
  Rows = @(
    @{ Type='split'; Label='Palette'; Text='Deep navy-teal #0B1C23, teal bars #1D5B63, mint accent #66B8B0.' },
    @{ Type='split'; Label='Typography'; Text='Cormorant Garamond for headings, Inter for body copy.' },
    @{ Type='split'; Label='Layout'; Text='Centered rounded panel, leafy page background, full-width forest hero photo.' },
    @{ Type='split'; Label='Details'; Text='Circular line-art icons, translucent pills, soft shadows and glassy top bars.' },
    @{ Type='header'; Text='Key idea' },
    @{ Type='full'; Text='The whole theme is scoped to body.jungle-home, so shared CSS does not break other pages.' }
  )
  Footer = "One CSS file changes the mood; the original design system stays underneath."
}

$slides += @{
  Name = "04 Homepage"
  Title = "03 - Homepage walkthrough"
  Subtitle = "What a visitor sees first"
  Rows = @(
    @{ Type='split'; Label='Top bar'; Text='Brand, navigation and a planner shortcut in a translucent teal bar.' },
    @{ Type='split'; Label='Hero'; Text='Forest photograph with a large white serif headline: "Grow with nature."' },
    @{ Type='split'; Label='Four circles'; Text='Quick links to Basics, Soil, Plant Library and Care.' },
    @{ Type='split'; Label='About block'; Text='Short introduction beside two real plant photos.' },
    @{ Type='split'; Label='Below fold'; Text='Stats, learning paths, six pillars, plant previews, a planner CTA and footer.' }
  )
  Footer = "Open index.html and compare it with the reference screenshot."
}

$slides += @{
  Name = "05 Design system"
  Title = "04 - Design system in code"
  Subtitle = "One structure, layered styles"
  Rows = @(
    @{ Type='split'; Label='style.css'; Text='Base tokens, layout, cards, buttons, tables, accordions and forms.' },
    @{ Type='split'; Label='jungle.css'; Text='Dark palette overrides, home panel, inner-page banners and navigation styling.' },
    @{ Type='split'; Label='game.css'; Text='Game board, enlarged selected plot, meters, sliders and controls.' },
    @{ Type='split'; Label='Tokens'; Text='CSS variables: --bg, --ink, --brand, --font-display and shadow scales.' },
    @{ Type='header'; Text='Why scoping matters' },
    @{ Type='full'; Text='Selectors begin with body.jungle-home, so every page can opt into the theme without rewriting shared components.' }
  )
  Footer = "Change a token once and every themed component follows."
}

$slides += @{
  Name = "06 Rollout"
  Title = "05 - Site-wide rollout"
  Subtitle = "Consistency across every page"
  Rows = @(
    @{ Type='split'; Label='Navigation'; Text='Home, Basics, Soil, Plant Library, Care, Advanced, Planner, India by State, Grow Lab.' },
    @{ Type='split'; Label='Page headers'; Text='Forest banner, friendly note pill and serif title with a short gradient underline.' },
    @{ Type='split'; Label='Components'; Text='Callouts, tables, chips, TOC and cards retuned for dark surfaces.' },
    @{ Type='split'; Label='Responsive'; Text='Menu collapses below 940px; grids and plots stack on small screens.' },
    @{ Type='split'; Label='Accessibility'; Text='Skip link, focus rings, aria labels and reduced-motion support.' }
  )
  Footer = "A friendly tone is part of the design: short notes on every guide."
}

$slides += @{
  Name = "07 Garden Lab"
  Title = "06 - Garden Lab (the game)"
  Subtitle = "A 21-day growing experiment"
  Rows = @(
    @{ Type='split'; Label='Goal'; Text='Keep plants alive for 21 days by matching the plant, the soil and the watering rhythm.' },
    @{ Type='split'; Label='Step 1'; Text='Pick one of 8 plants. Each card shows its water need and ideal soil mix.' },
    @{ Type='split'; Label='Step 2'; Text='Mix Loam + Compost + Drainage with sliders; the total always stays at 100%.' },
    @{ Type='split'; Label='Step 3'; Text='Plant it in one of three pots. Only the selected pot is shown in the spotlight.' },
    @{ Type='split'; Label='Day actions'; Text='Water the selected pot, skip 1 day, choose 2–14 days, or skip a whole week.' }
  )
  Footer = "Direct link: https://uday17.github.io/garden-guide/garden-game.html"
}

$slides += @{
  Name = "08 Simulation"
  Title = "07 - Simulation logic"
  Subtitle = "How survival is actually decided"
  Rows = @(
    @{ Type='split'; Label='Moisture'; Text='Each day adds 45 when watered and removes 30 when skipped; clamped to 0–100.' },
    @{ Type='split'; Label='Water bands'; Text='Daily 50–100, every 3 days 30–78, weekly 15–55, every 2 weeks 5–38.' },
    @{ Type='split'; Label='Soil mismatch'; Text='Half the sum of differences from the ideal mix; adds stress every day.' },
    @{ Type='split'; Label='Drainage'; Text='Low drainage amplifies overwatering; high drainage amplifies drought.' },
    @{ Type='split'; Label='Health'; Text='Gains up to +2.5 in ideal conditions, loses up to 25 on a badly stressed day.' },
    @{ Type='split'; Label='Verdict'; Text='At day 21: thriving at 60+, survived at 35+, otherwise it did not make it.' }
  )
  Footer = "This is the teaching point: more water is not always better water."
}

$slides += @{
  Name = "09 Plant data"
  Title = "08 - Plant data"
  Subtitle = "Eight plants, eight personalities"
  Rows = @(
    @{ Type='split'; Label='Daily'; Text='Tomato, Mint, Boston fern - moisture-loving plants in rich soil.' },
    @{ Type='split'; Label='Every 3 days'; Text='Monstera - rich soil with a little drainage; let the top dry slightly.' },
    @{ Type='split'; Label='Weekly'; Text='Snake plant, Lavender - gritty, fast-draining soil and dry spells.' },
    @{ Type='split'; Label='Fortnightly'; Text='Aloe vera, Prickly pear - let the soil dry out completely between drinks.' },
    @{ Type='header'; Text='Each plant record contains' },
    @{ Type='full'; Text='A real photo, a watering interval, an ideal soil mix, a moisture band and a friendly care tip.' }
  )
  Footer = "The same data could power a real plant-care recommendation engine."
}

$slides += @{
  Name = "10 Sounds"
  Title = "09 - Sounds and feedback"
  Subtitle = "Making the interface feel alive"
  Rows = @(
    @{ Type='split'; Label='Select'; Text='A soft two-note chime when a plant card is chosen.' },
    @{ Type='split'; Label='Plant'; Text='A low soil thud with a small sparkle when the plant goes into the pot.' },
    @{ Type='split'; Label='Water'; Text='A trickling, bubbling sound when the watering button is pressed.' },
    @{ Type='split'; Label='Skip'; Text='A quiet tick; a plant dying gets descending notes.' },
    @{ Type='split'; Label='Result'; Text='An ascending chime when most plants survive.' },
    @{ Type='split'; Label='Mute'; Text='The speaker button in the toolbar toggles all sounds on and off.' }
  )
  Footer = "Sounds are generated with the Web Audio API - no audio files to download."
}

$slides += @{
  Name = "11 File map"
  Title = "10 - File map"
  Subtitle = "Where to change things"
  Rows = @(
    @{ Type='split'; Label='index.html'; Text='Homepage markup: hero panel, circular links and about block.' },
    @{ Type='split'; Label='style.css'; Text='Original design system shared by all pages.' },
    @{ Type='split'; Label='jungle.css'; Text='Dark theme tokens, page banners and navigation styling.' },
    @{ Type='split'; Label='game.css'; Text='Game layout, plot spotlight, meters, sliders and buttons.' },
    @{ Type='split'; Label='game.js'; Text='Game state, planting, day simulation and rendering.' },
    @{ Type='split'; Label='game-audio.js'; Text='Small Web Audio sound effects.' },
    @{ Type='split'; Label='garden-game.html'; Text='The game page itself.' }
  )
  Footer = "All assets live inside garden-guide/assets so relative paths keep working."
}

$slides += @{
  Name = "12 Run and deploy"
  Title = "11 - Run and deploy"
  Subtitle = "From a local file to the live site"
  Rows = @(
    @{ Type='split'; Label='Preview locally'; Text='Open garden-guide/index.html in any modern browser.' },
    @{ Type='split'; Label='Test the game'; Text='Open garden-guide/garden-game.html; there is no build step.' },
    @{ Type='split'; Label='Deploy'; Text='Push to GitHub; .github/workflows/deploy.yml publishes to GitHub Pages.' },
    @{ Type='split'; Label='Live site'; Text='https://uday17.github.io/garden-guide/' },
    @{ Type='split'; Label='Checklist'; Text='Test desktop and 390px mobile, console errors, links and sound toggle.' }
  )
  Footer = "Tip: keep new images and scripts inside the garden-guide folder."
}

$slides += @{
  Name = "13 Talk track"
  Title = "12 - Suggested talk track"
  Subtitle = "A simple 10-minute presentation"
  Rows = @(
    @{ Type='split'; Label='1 min'; Text='Show the reference image and the live homepage side by side.' },
    @{ Type='split'; Label='2 min'; Text='Explain the scoped dark theme and reusable CSS tokens.' },
    @{ Type='split'; Label='2 min'; Text='Walk through the navigation and the friendly inner-page headers.' },
    @{ Type='split'; Label='3 min'; Text='Play the Garden Lab: plant, water, skip a week and read the verdict.' },
    @{ Type='split'; Label='1 min'; Text='Show the file map, the GitHub link and how to deploy.' },
    @{ Type='header'; Text='Questions to invite' },
    @{ Type='full'; Text='How would you add a new plant? What happens at 0% drainage? How would you translate this site?' }
  )
  Footer = "End on the idea that small, repeatable habits - in gardening and in code - produce the best results."
}

# ---------------- Package parts ----------------
$stylesXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="8">
<font><sz val="11"/><color rgb="FF1A2B30"/><name val="Aptos"/></font>
<font><b/><sz val="26"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
<font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
<font><b/><sz val="11"/><color rgb="FF0B1C23"/><name val="Aptos"/></font>
<font><sz val="11"/><color rgb="FFE6F1EE"/><name val="Aptos"/></font>
<font><sz val="10"/><color rgb="FF9CB6B2"/><name val="Aptos"/></font>
<font><b/><sz val="14"/><color rgb="FF8FD8CF"/><name val="Aptos"/></font>
<font><sz val="11"/><color rgb="FF0B1C23"/><name val="Aptos"/></font>
</fonts>
<fills count="8">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0B1C23"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1D5B63"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF15313A"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF66B8B0"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE4F0E6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0E2A31"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center" horizontal="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="7" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
'@

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'

$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

$workbookSheets = ""
$workbookRels = ""
for ($i = 0; $i -lt $slides.Count; $i++) {
  $n = $i + 1
  $name = Esc $slides[$i].Name
  $workbookSheets += '<sheet name="' + $name + '" sheetId="' + $n + '" r:id="rId' + $n + '"/>'
  $workbookRels += '<Relationship Id="rId' + $n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + $n + '.xml"/>'
  $contentTypes += '<Override PartName="/xl/worksheets/sheet' + $n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
}
$styleRelId = $slides.Count + 1
$workbookRels += '<Relationship Id="rId' + $styleRelId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
$contentTypes += '</Types>'

$workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets>' + $workbookSheets + '</sheets></workbook>'
$workbookRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + $workbookRels + '</Relationships>'

if (Test-Path $outPath) { Remove-Item $outPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($outPath, [System.IO.Compression.ZipArchiveMode]::Create)
Add-ZipEntry $zip "[Content_Types].xml" $contentTypes
Add-ZipEntry $zip "_rels/.rels" $rootRels
Add-ZipEntry $zip "xl/workbook.xml" $workbookXml
Add-ZipEntry $zip "xl/_rels/workbook.xml.rels" $workbookRelsXml
Add-ZipEntry $zip "xl/styles.xml" $stylesXml
for ($i = 0; $i -lt $slides.Count; $i++) {
  Add-ZipEntry $zip ("xl/worksheets/sheet" + ($i + 1) + ".xml") (New-SheetXml $slides[$i])
}
$zip.Dispose()

Get-Item $outPath | Select-Object FullName, Length
