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

function App() {
  const [rows, setRows] = useState([
    { id: crypto.randomUUID(), size: 0.48, columns: makeColumns(2) },
    { id: crypto.randomUUID(), size: 0.52, columns: makeColumns(3) },
  ])
  const [aspectIndex, setAspectIndex] = useState(0)
  const [activeRowId, setActiveRowId] = useState(null)
  const canvasRef = useRef(null)

  const updateRows = (updater) => setRows((currentRows) => updater(currentRows))
  const activeRow = rows.find((row) => row.id === activeRowId)

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
    <header className="topbar"><div className="brand"><span className="brand-mark">/</span>ImgGridly</div><button className="export-button" type="button">Export</button></header>
    <section className="workspace" aria-label="Collage editor">
      <div ref={canvasRef} className="collage-frame" style={{ '--frame-ratio': ASPECTS[aspectIndex].ratio, aspectRatio: ASPECTS[aspectIndex].value }}>
        {rows.map((row, rowIndex) => <div className={`grid-row ${activeRowId === row.id ? 'is-active' : ''}`} key={row.id} style={{ flex: row.size }} onClick={() => setActiveRowId(row.id)}>
          {row.columns.map((column, columnIndex) => <div className="grid-cell" key={`${row.id}-${columnIndex}`} style={{ flex: column }}>
            <button type="button" className="add-image" aria-label={`Add image to row ${rowIndex + 1}, cell ${columnIndex + 1}`}><span>+</span><small>Add photo</small></button>
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
    </section>
  </main>
}

export default App