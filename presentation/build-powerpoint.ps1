# Builds GrowWell-Intern-Presentation.pptx from the workbook content.
# Generates the Open XML package directly (no PowerPoint / Python / Node needed).

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$folder = $PSScriptRoot
$xlsxPath = Join-Path $folder "GrowWell-Intern-Presentation.xlsx"
$outPath = Join-Path $folder "GrowWell-Intern-Presentation.pptx"

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

# ---------------- Read slide content from the xlsx ----------------
$xzip = [System.IO.Compression.ZipFile]::OpenRead($xlsxPath)
$slides = @()

for ($i = 1; $i -le 13; $i++) {
  $entry = $xzip.GetEntry("xl/worksheets/sheet$i.xml")
  if (-not $entry) { continue }
  $stream = $entry.Open()
  $reader = New-Object System.IO.StreamReader($stream)
  [xml]$doc = $reader.ReadToEnd()
  $reader.Dispose()

  $ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
  $ns.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  function CellText([string]$ref) {
    $node = $doc.SelectSingleNode("//m:c[@ref='$ref']", $ns)
    if ($node) { return $node.InnerText }
    return ""
  }

  $title = CellText "A1"
  $subtitle = CellText "A4"
  $footer = CellText "A29"
  $rows = @()

  foreach ($row in $doc.SelectNodes("//m:sheetData/m:row", $ns)) {
    $rn = [int]$row.GetAttribute("r")
    if ($rn -lt 6 -or $rn -gt 28) { continue }
    $a = $row.SelectSingleNode("m:c[substring(@ref,1,1)='A']", $ns)
    $c = $row.SelectSingleNode("m:c[substring(@ref,1,1)='C']", $ns)
    if (-not $a) { continue }
    $style = $a.GetAttribute("s")
    $atext = $a.InnerText
    if ($c) {
      $rows += @{ Type='split'; Label=$atext; Text=$c.InnerText }
    } elseif ($style -eq '4') {
      $rows += @{ Type='header'; Text=$atext }
    } elseif ($atext) {
      $rows += @{ Type='full'; Text=$atext }
    }
  }

  $slides += @{ Title=$title; Subtitle=$subtitle; Footer=$footer; Rows=$rows }
}
$xzip.Dispose()

# ---------------- Shape helpers ----------------
function New-Shape([int]$id, [string]$name, [int]$x, [int]$y, [int]$w, [int]$h,
                   [string]$fill, [string]$text, [int]$size, [string]$bold,
                   [string]$color, [string]$align) {
  $fillXml = '<a:noFill/>'
  if ($fill) { $fillXml = '<a:solidFill><a:srgbClr val="' + $fill + '"/></a:solidFill>' }
  $b = if ($bold -eq '1') { '1' } else { '0' }
  return '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + $id + '" name="' + $name + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + $x + '" y="' + $y + '"/><a:ext cx="' + $w + '" cy="' + $h + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' + $fillXml + '<a:ln><a:noFill/></a:ln></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square" lIns="110000" tIns="60000" rIns="110000" bIns="60000" anchor="ctr"/><a:lstStyle/>' +
    '<a:p><a:pPr algn="' + $align + '"/><a:r>' +
    '<a:rPr lang="en-US" sz="' + $size + '" b="' + $b + '" dirty="0"><a:solidFill><a:srgbClr val="' + $color + '"/></a:solidFill>' +
    '<a:latin typeface="Aptos"/></a:rPr><a:t>' + (Esc $text) + '</a:t></a:r></a:p></p:txBody></p:sp>'
}

function RowHeight([string]$text, [int]$charsPerLine) {
  $lines = [math]::Ceiling($text.Length / $charsPerLine)
  return [math]::Max(380000, ($lines * 225000 + 150000))
}

function New-SlideXml($slide) {
  $shapes = @()
  $id = 2

  # Title box
  $shapes += New-Shape $id "Title" 600000 350000 11000000 850000 "1D5B63" $slide.Title 2800 "1" "FFFFFF" "l"
  $id++
  # Subtitle box
  $shapes += New-Shape $id "Subtitle" 600000 1250000 11000000 420000 "" $slide.Subtitle 1600 "1" "8FD8CF" "l"
  $id++

  $y = 1850000
  foreach ($row in $slide.Rows) {
    if ($row.Type -eq 'header') {
      $h = 360000
      $shapes += New-Shape $id "Section" 600000 $y 11000000 $h "1D5B63" $row.Text 1400 "1" "FFFFFF" "l"
      $id++
    } elseif ($row.Type -eq 'split') {
      $h = RowHeight $row.Text 100
      $shapes += New-Shape $id "Label" 600000 $y 1750000 $h "66B8B0" $row.Label 1200 "1" "0B1C23" "ctr"
      $id++
      $shapes += New-Shape $id "Body" 2450000 $y 9450000 $h "15313A" $row.Text 1200 "0" "EEF7F4" "l"
      $id++
    } else {
      $h = RowHeight $row.Text 118
      $shapes += New-Shape $id "Body" 600000 $y 11000000 $h "15313A" $row.Text 1200 "0" "EEF7F4" "l"
      $id++
    }
    $y += $h + 90000
    if ($y -gt 6250000) { break }
  }

  # Footer
  $shapes += New-Shape $id "Footer" 600000 6350000 11000000 300000 "" $slide.Footer 1000 "0" "9CB6B2" "l"

  $group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
           '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld name="Slide"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="0B1C23"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    '<p:spTree>' + $group + ($shapes -join "") + '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
}

# ---------------- Package parts ----------------
$nsA = 'http://schemas.openxmlformats.org/drawingml/2006/main'
$nsR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
$nsP = 'http://schemas.openxmlformats.org/presentationml/2006/main'
$nsRel = 'http://schemas.openxmlformats.org/package/2006/relationships'

$slideIdList = ""
$presRels = '<Relationship Id="rId1" Type="' + $nsR + '/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
  '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
  '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
  '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'

for ($i = 0; $i -lt $slides.Count; $i++) {
  $n = $i + 1
  $rid = $i + 2
  $sid = 256 + $i
  $slideIdList += '<p:sldId id="' + $sid + '" r:id="rId' + $rid + '"/>'
  $presRels += '<Relationship Id="rId' + $rid + '" Type="' + $nsR + '/slide" Target="slides/slide' + $n + '.xml"/>'
  $contentTypes += '<Override PartName="/ppt/slides/slide' + $n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
}
$themeRid = $slides.Count + 2
$presRels += '<Relationship Id="rId' + $themeRid + '" Type="' + $nsR + '/theme" Target="theme/theme1.xml"/>'
$contentTypes += '</Types>'

$presentationXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<p:presentation xmlns:a="' + $nsA + '" xmlns:r="' + $nsR + '" xmlns:p="' + $nsP + '">' +
  '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
  '<p:sldIdLst>' + $slideIdList + '</p:sldIdLst>' +
  '<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/>' +
  '</p:presentation>'

$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="' + $nsRel + '">' +
  '<Relationship Id="rId1" Type="' + $nsR + '/officeDocument" Target="ppt/presentation.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  '<Relationship Id="rId3" Type="' + $nsR + '/extended-properties" Target="docProps/app.xml"/>' +
  '</Relationships>'

$presRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + $nsRel + '">' + $presRels + '</Relationships>'

$masterXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<p:sldMaster xmlns:a="' + $nsA + '" xmlns:r="' + $nsR + '" xmlns:p="' + $nsP + '">' +
  '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="0B1C23"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
  '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
  '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink" bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"/>' +
  '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>'

$masterRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + $nsRel + '">' +
  '<Relationship Id="rId1" Type="' + $nsR + '/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
  '<Relationship Id="rId2" Type="' + $nsR + '/theme" Target="../theme/theme1.xml"/>' +
  '</Relationships>'

$layoutXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<p:sldLayout xmlns:a="' + $nsA + '" xmlns:r="' + $nsR + '" xmlns:p="' + $nsP + '" type="blank" preserve="1">' +
  '<p:cSld name="Blank"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="0B1C23"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
  '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
  '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'

$layoutRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + $nsRel + '">' +
  '<Relationship Id="rId1" Type="' + $nsR + '/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
  '</Relationships>'

$themeXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<a:theme xmlns:a="' + $nsA + '" name="GrowWell"><a:themeElements>' +
  '<a:clrScheme name="GrowWell">' +
  '<a:dk1><a:srgbClr val="0B1C23"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>' +
  '<a:dk2><a:srgbClr val="15313A"/></a:dk2><a:lt2><a:srgbClr val="EEF7F4"/></a:lt2>' +
  '<a:accent1><a:srgbClr val="66B8B0"/></a:accent1><a:accent2><a:srgbClr val="1D5B63"/></a:accent2>' +
  '<a:accent3><a:srgbClr val="8FD8CF"/></a:accent3><a:accent4><a:srgbClr val="DDA675"/></a:accent4>' +
  '<a:accent5><a:srgbClr val="82C6D0"/></a:accent5><a:accent6><a:srgbClr val="A9D8D2"/></a:accent6>' +
  '<a:hlink><a:srgbClr val="8FD8CF"/></a:hlink><a:folHlink><a:srgbClr val="DDA675"/></a:folHlink>' +
  '</a:clrScheme>' +
  '<a:fontScheme name="GrowWell"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
  '<a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
  '<a:fmtScheme name="GrowWell"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme>' +
  '</a:themeElements></a:theme>'

$coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
  'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  '<dc:title>GrowWell Intern Presentation</dc:title><dc:creator>GrowWell</dc:creator>' +
  '<cp:lastModifiedBy>GrowWell</cp:lastModifiedBy></cp:coreProperties>'

$appXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
  'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
  '<Application>GrowWell Generator</Application><Slides>' + $slides.Count + '</Slides></Properties>'

if (Test-Path $outPath) { Remove-Item $outPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($outPath, [System.IO.Compression.ZipArchiveMode]::Create)
Add-ZipEntry $zip "[Content_Types].xml" $contentTypes
Add-ZipEntry $zip "_rels/.rels" $rootRels
Add-ZipEntry $zip "docProps/core.xml" $coreXml
Add-ZipEntry $zip "docProps/app.xml" $appXml
Add-ZipEntry $zip "ppt/presentation.xml" $presentationXml
Add-ZipEntry $zip "ppt/_rels/presentation.xml.rels" $presRelsXml
Add-ZipEntry $zip "ppt/slideMasters/slideMaster1.xml" $masterXml
Add-ZipEntry $zip "ppt/slideMasters/_rels/slideMaster1.xml.rels" $masterRels
Add-ZipEntry $zip "ppt/slideLayouts/slideLayout1.xml" $layoutXml
Add-ZipEntry $zip "ppt/slideLayouts/_rels/slideLayout1.xml.rels" $layoutRels
Add-ZipEntry $zip "ppt/theme/theme1.xml" $themeXml

for ($i = 0; $i -lt $slides.Count; $i++) {
  $n = $i + 1
  Add-ZipEntry $zip ("ppt/slides/slide$n.xml") (New-SlideXml $slides[$i])
  $srels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + $nsRel + '">' +
    '<Relationship Id="rId1" Type="' + $nsR + '/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>'
  Add-ZipEntry $zip ("ppt/slides/_rels/slide$n.xml.rels") $srels
}
$zip.Dispose()

Get-Item $outPath | Select-Object FullName, Length
