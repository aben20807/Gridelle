import { useRef, useState } from 'react'
import './App.css'

const ASPECTS = [
  { label: 'Portrait', dimensions: '1080 x 1350', value: '4 / 5', ratio: 0.8 },
  { label: 'Square', dimensions: '1080 x 1080', value: '1 / 1', ratio: 1 },
  { label: 'Feed Landscape', dimensions: '1080 x 566', value: '1.91 / 1', ratio: 1.91 },
  { label: 'Stories & Reels', dimensions: '1080 x 1920', value: '9 / 16', ratio: 0.5625 },
]
const MIN_ROW = 0.12
const MIN_CELL = 0.12
const makeColumns = (count) => Array.from({ length: count }, () => 1 / count)
const EXPORT_SIZES = [{ width: 1080, height: 1350 }, { width: 1080, height: 1080 }, { width: 1080, height: 566 }, { width: 1080, height: 1920 }]
const defaultTransform = () => ({ x: 0, y: 0, scale: 1 })

function ImageCell({ image, onUpload, onUpdate, onClear, label }) {
  const inputRef = useRef(null)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)

  const reset = () => onUpdate(defaultTransform())

  const handlePointerDown = (event) => {
    if (!image) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 2) {
      const [first, second] = pointersRef.current.values()
      gestureRef.current = {
        type: 'pinch',
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: image.scale,
      }
    } else {
      gestureRef.current = { type: 'pan', x: event.clientX, y: event.clientY, imageX: image.x, imageY: image.y }
    }
  }

  const handlePointerMove = (event) => {
    if (!image || !pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const gesture = gestureRef.current
    if (!gesture) return
    if (gesture.type === 'pinch' && pointersRef.current.size === 2) {
      const [first, second] = pointersRef.current.values()
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      onUpdate({ ...image, scale: Math.max(1, Math.min(4, gesture.scale * distance / gesture.distance)) })
    } else if (gesture.type === 'pan') {
      onUpdate({ ...image, x: gesture.imageX + event.clientX - gesture.x, y: gesture.imageY + event.clientY - gesture.y })
    }
  }

  const handlePointerUp = (event) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size === 1 && image) {
      const [pointer] = pointersRef.current.values()
      gestureRef.current = { type: 'pan', x: pointer.x, y: pointer.y, imageX: image.x, imageY: image.y }
    } else if (pointersRef.current.size === 0) {
      gestureRef.current = null
    }
  }

  const handleFile = (event) => {
    const [file] = event.target.files
    if (file?.type.startsWith('image/')) onUpload(URL.createObjectURL(file))
    event.target.value = ''
  }

  return <div
    className={`image-cell-content ${image ? 'has-image' : ''}`}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onPointerCancel={handlePointerUp}
    onDoubleClick={image ? reset : undefined}
    onWheel={(event) => image && onUpdate({ ...image, scale: Math.max(1, Math.min(4, image.scale - event.deltaY * 0.002)) })}
  >
    {image ? <img className="cell-image" src={image.src} alt={label} style={{ transform: `translate(${image.x}px, ${image.y}px) scale(${image.scale})` }} draggable="false" /> : <button type="button" className="add-image" onClick={() => inputRef.current?.click()} aria-label={`Add image to ${label}`}><span>+</span><small>Add photo</small></button>}
    <input ref={inputRef} className="image-input" type="file" accept="image/*" onChange={handleFile} />
    {image && <div className="cell-actions" onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => inputRef.current?.click()}>Replace</button><button type="button" onClick={onClear}>Clear</button><button type="button" onClick={reset} aria-label="Reset image position">Reset</button></div>}
  </div>
}

function App() {
  const [rows, setRows] = useState([
    { id: crypto.randomUUID(), size: 0.48, columns: makeColumns(2) },
    { id: crypto.randomUUID(), size: 0.52, columns: makeColumns(3) },
  ])
  const [aspectIndex, setAspectIndex] = useState(0)
  const [activeRowId, setActiveRowId] = useState(null)
  const [images, setImages] = useState({})
  const [exportFormat, setExportFormat] = useState('jpg')
  const [exportQuality, setExportQuality] = useState(90)
  const [exporting, setExporting] = useState(false)
  const canvasRef = useRef(null)

  const updateRows = (updater) => setRows((currentRows) => updater(currentRows))
  const activeRow = rows.find((row) => row.id === activeRowId)
  const updateImage = (cellId, image) => setImages((currentImages) => ({ ...currentImages, [cellId]: { ...currentImages[cellId], ...image } }))
  const uploadImage = (cellId, src) => setImages((currentImages) => {
    if (currentImages[cellId]?.src) URL.revokeObjectURL(currentImages[cellId].src)
    return { ...currentImages, [cellId]: { src, ...defaultTransform() } }
  })
  const clearImage = (cellId) => setImages((currentImages) => {
    if (currentImages[cellId]?.src) URL.revokeObjectURL(currentImages[cellId].src)
    const nextImages = { ...currentImages }
    delete nextImages[cellId]
    return nextImages
  })

  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })

  const createExportBlob = async () => {
    const { width, height } = EXPORT_SIZES[aspectIndex]
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context.fillStyle = '#283129'
    context.fillRect(0, 0, width, height)
    const frame = canvasRef.current.getBoundingClientRect()
    const loadedImages = new Map(await Promise.all(Object.entries(images).map(async ([cellId, image]) => [cellId, [await loadImage(image.src), image]])))
    let rowTop = 0
    rows.forEach((row) => {
      let cellLeft = 0
      const rowHeight = row.size * height
      row.columns.forEach((column, columnIndex) => {
        const cellWidth = column * width
        const cellId = `${row.id}-${columnIndex}`
        const loaded = loadedImages.get(cellId)
        if (loaded) {
          const [imageElement, transform] = loaded
          const scale = Math.max(cellWidth / imageElement.naturalWidth, rowHeight / imageElement.naturalHeight)
          const drawWidth = imageElement.naturalWidth * scale
          const drawHeight = imageElement.naturalHeight * scale
          context.save()
          context.beginPath()
          context.rect(cellLeft, rowTop, cellWidth, rowHeight)
          context.clip()
          context.translate(cellLeft + cellWidth / 2 + transform.x * width / frame.width, rowTop + rowHeight / 2 + transform.y * width / frame.width)
          context.scale(transform.scale, transform.scale)
          context.drawImage(imageElement, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
          context.restore()
        }
        cellLeft += cellWidth
      })
      rowTop += rowHeight
    })
    return new Promise((resolve) => canvas.toBlob(resolve, exportFormat === 'png' ? 'image/png' : 'image/jpeg', exportFormat === 'png' ? undefined : exportQuality / 100))
  }

  const downloadExport = async () => {
    setExporting(true)
    const blob = await createExportBlob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `imggridly-${ASPECTS[aspectIndex].label.toLowerCase().replaceAll(' ', '-')}.${exportFormat}`
    link.click()
    URL.revokeObjectURL(link.href)
    setExporting(false)
  }

  const shareExport = async () => {
    setExporting(true)
    const blob = await createExportBlob()
    const file = new File([blob], `imggridly-collage.${exportFormat}`, { type: blob.type })
    if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ files: [file], title: 'ImgGridly collage' })
    else await downloadExport()
    setExporting(false)
  }

  const addRow = () => updateRows((currentRows) => {
    const size = 1 / (currentRows.length + 1)
    return [...currentRows.map((row) => ({ ...row, size })), { id: crypto.randomUUID(), size, columns: makeColumns(2) }]
  })

  const removeRow = () => {
    if (rows.length <= 1) return
    updateRows((currentRows) => {
      const remainingRows = currentRows.slice(0, -1)
      const total = remainingRows.reduce((sum, row) => sum + row.size, 0)
      return remainingRows.map((row) => ({ ...row, size: row.size / total }))
    })
  }

  const changeColumns = (rowId, direction) => updateRows((currentRows) => currentRows.map((row) => {
    if (row.id !== rowId) return row
    const count = Math.max(1, Math.min(6, row.columns.length + direction))
    return { ...row, columns: makeColumns(count) }
  }))

  const startRowResize = (event, rowIndex) => {
    event.preventDefault()
    const frameHeight = canvasRef.current?.getBoundingClientRect().height
    if (!frameHeight) return
    const startY = event.clientY
    const startingRows = rows
    event.currentTarget.setPointerCapture(event.pointerId)
    const onMove = (moveEvent) => {
      const first = startingRows[rowIndex]
      const second = startingRows[rowIndex + 1]
      const delta = Math.max(MIN_ROW - first.size, Math.min(second.size - MIN_ROW, (moveEvent.clientY - startY) / frameHeight))
      updateRows(() => startingRows.map((row, index) => index === rowIndex ? { ...row, size: first.size + delta } : index === rowIndex + 1 ? { ...row, size: second.size - delta } : row))
    }
    event.currentTarget.addEventListener('pointermove', onMove)
    event.currentTarget.addEventListener('pointerup', () => event.currentTarget.removeEventListener('pointermove', onMove), { once: true })
  }

  const startColumnResize = (event, rowId, columnIndex) => {
    event.preventDefault()
    const frameWidth = canvasRef.current?.getBoundingClientRect().width
    if (!frameWidth) return
    const startX = event.clientX
    const startingRows = rows
    event.currentTarget.setPointerCapture(event.pointerId)
    const onMove = (moveEvent) => updateRows(() => startingRows.map((row) => {
      if (row.id !== rowId) return row
      const first = row.columns[columnIndex]
      const second = row.columns[columnIndex + 1]
      const delta = Math.max(MIN_CELL - first, Math.min(second - MIN_CELL, (moveEvent.clientX - startX) / frameWidth))
      return { ...row, columns: row.columns.map((size, index) => index === columnIndex ? first + delta : index === columnIndex + 1 ? second - delta : size) }
    }))
    event.currentTarget.addEventListener('pointermove', onMove)
    event.currentTarget.addEventListener('pointerup', () => event.currentTarget.removeEventListener('pointermove', onMove), { once: true })
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">/</span>ImgGridly</div></header>
    <section className="workspace" aria-label="Collage editor">
      <div ref={canvasRef} className="collage-frame" style={{ '--frame-ratio': ASPECTS[aspectIndex].ratio, aspectRatio: ASPECTS[aspectIndex].value }}>
        {rows.map((row, rowIndex) => <div className={`grid-row ${activeRowId === row.id ? 'is-active' : ''}`} key={row.id} style={{ flex: row.size }} onClick={() => setActiveRowId(row.id)}>
          {row.columns.map((column, columnIndex) => <div className="grid-cell" key={`${row.id}-${columnIndex}`} style={{ flex: column }}>
            <ImageCell image={images[`${row.id}-${columnIndex}`]} onUpload={(src) => uploadImage(`${row.id}-${columnIndex}`, src)} onUpdate={(image) => updateImage(`${row.id}-${columnIndex}`, image)} onClear={() => clearImage(`${row.id}-${columnIndex}`)} label={`row ${rowIndex + 1}, cell ${columnIndex + 1}`} />
            {columnIndex < row.columns.length - 1 && <div className="column-divider" role="separator" aria-orientation="vertical" onPointerDown={(event) => startColumnResize(event, row.id, columnIndex)} />}
          </div>)}
          {rowIndex < rows.length - 1 && <div className="row-divider" role="separator" aria-orientation="horizontal" onPointerDown={(event) => startRowResize(event, rowIndex)} />}
        </div>)}
      </div>
    </section>
    <section className="editor-panel" aria-label="Layout controls">
      <div className="panel-label">Canvas format</div>
      <div className="aspect-options" role="tablist" aria-label="Canvas aspect ratio">{ASPECTS.map((aspect, index) => <button className={aspectIndex === index ? 'is-selected' : ''} key={aspect.label} type="button" role="tab" aria-selected={aspectIndex === index} onClick={() => setAspectIndex(index)}><span className={`aspect-icon a-${index}`} /><strong>{aspect.label}</strong><small>{aspect.dimensions}</small></button>)}</div>
      <div className="layout-controls">
        <div><span className="panel-label">Rows</span><div className="stepper"><button type="button" onClick={removeRow} disabled={rows.length === 1} aria-label="Remove row">-</button><output>{rows.length}</output><button type="button" onClick={addRow} aria-label="Add row">+</button></div></div>
        <div><span className="panel-label">Columns {activeRow ? `in row ${rows.findIndex((row) => row.id === activeRowId) + 1}` : ''}</span><div className="stepper"><button type="button" onClick={() => activeRowId && changeColumns(activeRowId, -1)} disabled={!activeRow || activeRow.columns.length === 1} aria-label="Remove column">-</button><output>{activeRow?.columns.length ?? '-'}</output><button type="button" onClick={() => activeRowId && changeColumns(activeRowId, 1)} disabled={!activeRow} aria-label="Add column">+</button></div></div>
      </div>
      <div className="export-sheet" aria-label="Export collage">
        <div className="export-heading"><div><span className="panel-label">Export collage</span><strong>{ASPECTS[aspectIndex].dimensions}</strong></div></div>
        <div className="format-toggle"><button type="button" className={exportFormat === 'jpg' ? 'is-selected' : ''} onClick={() => setExportFormat('jpg')}>JPG</button><button type="button" className={exportFormat === 'png' ? 'is-selected' : ''} onClick={() => setExportFormat('png')}>PNG</button></div>
        {exportFormat === 'jpg' && <label className="quality-control">Quality <output>{exportQuality}%</output><input type="range" min="10" max="100" value={exportQuality} onChange={(event) => setExportQuality(Number(event.target.value))} /></label>}
        <div className="export-actions"><button type="button" onClick={downloadExport} disabled={exporting}>{exporting ? 'Rendering...' : 'Download'}</button><button type="button" className="share-button" onClick={shareExport} disabled={exporting}>Share</button></div>
      </div>
    </section>
  </main>
}

export default App