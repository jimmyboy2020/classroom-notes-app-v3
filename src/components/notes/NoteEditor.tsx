import { useEffect, useRef, useState } from 'react';
import { fabric as fabricInstance } from 'fabric'; // Aliased import
import { Note } from '@/types';

interface NoteEditorProps {
  note: Note;
  readOnly?: boolean;
  onSave?: (content: string) => Promise<void>;
}

export default function NoteEditor({ note, readOnly = false, onSave }: NoteEditorProps) {
  const canvasRef = useRef<fabricInstance.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [activeObject, setActiveObject] = useState<fabricInstance.Object | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [color, setColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [historyPosition, setHistoryPosition] = useState<number>(-1);
  const [history, setHistory] = useState<string[]>([]);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const straightenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathRef = useRef<fabricInstance.Object | null>(null);
  const drawingStartPointRef = useRef<{x: number, y: number} | null>(null);
  const drawingEndPointRef = useRef<{x: number, y: number} | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const shiftKeyDownRef = useRef<boolean>(false);

  const pencilBrushRef = useRef<fabricInstance.PencilBrush | null>(null);
  const customPenBrushRef = useRef<fabricInstance.BaseBrush | null>(null);
  
  // Parse note content
  const initialContent = note.content ? JSON.parse(note.content) : { objects: [], background: note.background_type };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Add to history whenever there's a canvas change
  const addToHistory = (canvas: fabricInstance.Canvas) => {
    if (!canvas) return;
    
    // Get current state
    const currentState = JSON.stringify(canvas.toJSON(['selectable', 'evented']));
    
    // If we're not at the end of the history, remove everything after current position
    if (historyPosition < history.length - 1) {
      setHistory(prev => prev.slice(0, historyPosition + 1));
    }
    
    // Add current state to history
    setHistory(prev => [...prev, currentState]);
    setHistoryPosition(prev => prev + 1);
  };
  
  // Undo function
  const handleUndo = () => {
    if (historyPosition <= 0 || !canvasRef.current) return;
    
    const newPosition = historyPosition - 1;
    const canvas = canvasRef.current;
    
    // Load previous state
    canvas.loadFromJSON(JSON.parse(history[newPosition]), () => {
      canvas.renderAll();
      setHistoryPosition(newPosition);
    });
  };
  
  // Redo function
  const handleRedo = () => {
    if (historyPosition >= history.length - 1 || !canvasRef.current) return;
    
    const newPosition = historyPosition + 1;
    const canvas = canvasRef.current;
    
    // Load next state
    canvas.loadFromJSON(JSON.parse(history[newPosition]), () => {
      canvas.renderAll();
      setHistoryPosition(newPosition);
    });
  };
  
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    
    // Initialize canvas
    const canvas = new fabricInstance.Canvas('note-canvas', {
      width: canvasContainerRef.current.clientWidth,
      height: 3000, // Increased height for "infinite" feel
      backgroundColor: '#ffffff',
      isDrawingMode: false,
      enableRetinaScaling: true, // Better for high-dpi displays
    });
    
    canvasRef.current = canvas;

    // Initialize brushes
    pencilBrushRef.current = new fabricInstance.PencilBrush(canvas);
    pencilBrushRef.current.color = color;
    pencilBrushRef.current.width = brushSize;
    canvas.freeDrawingBrush = pencilBrushRef.current; // Default to pencil
    
    // Create custom pen brush
    customPenBrushRef.current = new fabricInstance.PencilBrush(canvas);
    if (customPenBrushRef.current) {
      customPenBrushRef.current.color = color;
      customPenBrushRef.current.width = brushSize;
      customPenBrushRef.current.strokeLineCap = 'round';
      customPenBrushRef.current.strokeLineJoin = 'round';
    }
    
    // Draw background
    drawBackground(canvas, note.background_type);
    
    // Load objects from content
    if (initialContent.objects && initialContent.objects.length > 0) {
      fabricInstance.util.enlivenObjects(initialContent.objects, (objects) => {
        objects.forEach((obj) => {
          canvas.add(obj);
        });
        canvas.renderAll();
      }, 'fabric');
    }
    
    // Set up event listeners
    canvas.on('selection:created', (e) => {
      setActiveObject(canvas.getActiveObject());
    });
    
    canvas.on('selection:updated', (e) => {
      setActiveObject(canvas.getActiveObject());
    });
    
    canvas.on('selection:cleared', () => {
      setActiveObject(null);
    });
    
    // Track history for undo/redo
    canvas.on('object:added', () => {
      addToHistory(canvas);
    });
    
    canvas.on('object:modified', () => {
      addToHistory(canvas);
    });
    
    canvas.on('object:removed', () => {
      addToHistory(canvas);
    });

    // Line straightening feature - track when path drawing starts
    canvas.on('path:created', (e) => {
      if (!e.path) return;
      
      lastPathRef.current = e.path;
      
      if (isDrawingRef.current && drawingStartPointRef.current && drawingEndPointRef.current) {
        // If shift key is pressed, straighten the line immediately
        if (shiftKeyDownRef.current) {
          straightenLastLine();
        } else if (straightenTimerRef.current) {
          // Otherwise, check if we should start the straightening timer
          clearTimeout(straightenTimerRef.current);
          straightenTimerRef.current = setTimeout(() => {
            straightenLastLine();
          }, 1000); // 1 second hold to straighten
        }
      }
      
      isDrawingRef.current = false;
    });
    
    // Track drawing start and end points
    canvas.on('mouse:down', (e) => {
      if (canvas.isDrawingMode && (activeTool === 'pen' || activeTool === 'pencil')) {
        isDrawingRef.current = true;
        if (e.pointer) {
          drawingStartPointRef.current = { x: e.pointer.x, y: e.pointer.y };
        }
        
        // Clear any existing straightening timer
        if (straightenTimerRef.current) {
          clearTimeout(straightenTimerRef.current);
          straightenTimerRef.current = null;
        }
      }
    });
    
    canvas.on('mouse:move', (e) => {
      if (isDrawingRef.current && e.pointer) {
        drawingEndPointRef.current = { x: e.pointer.x, y: e.pointer.y };
        
        // If shift key is down, apply constraint logic for straight lines
        if (shiftKeyDownRef.current && canvas.isDrawingMode) {
          applyConstraint(e);
        }
        
        // Clear any existing straightening timer when moving
        if (straightenTimerRef.current) {
          clearTimeout(straightenTimerRef.current);
          straightenTimerRef.current = null;
        }
      }
    });
    
    canvas.on('mouse:up', (e) => {
      if (isDrawingRef.current && e.pointer) {
        drawingEndPointRef.current = { x: e.pointer.x, y: e.pointer.y };
      }
    });
    
    // Make read-only if needed
    if (readOnly) {
      canvas.selection = false;
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }
    
    // Handle keyboard events for shift key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyDownRef.current = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyDownRef.current = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Initial history state
    addToHistory(canvas);
    
    // Handle window resize
    const handleResize = () => {
      if (canvasContainerRef.current && canvas) {
        canvas.setWidth(canvasContainerRef.current.clientWidth);
        canvas.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (straightenTimerRef.current) {
        clearTimeout(straightenTimerRef.current);
      }
      canvas.dispose();
    };
  }, [note.background_type, note.content, readOnly]); // Removed color, brushSize from deps as they are handled by direct brush updates
  
  // Apply constraint logic for straight lines when shift key is pressed
  const applyConstraint = (e: fabric.IEvent) => {
    if (!drawingStartPointRef.current || !e.pointer) return;
    
    const start = drawingStartPointRef.current;
    const current = { x: e.pointer.x, y: e.pointer.y };
    
    // Calculate differences in x and y directions
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    
    // Determine the constraint direction based on the dominant axis
    // Horizontal, vertical, or 45-degree diagonal
    if (dx > dy) {
      // Horizontal constraint (x-axis)
      e.pointer.y = start.y;
    } else if (dy > dx) {
      // Vertical constraint (y-axis)
      e.pointer.x = start.x;
    } else {
      // 45-degree diagonal constraint
      // Determine which quadrant to move in
      const signX = current.x > start.x ? 1 : -1;
      const signY = current.y > start.y ? 1 : -1;
      
      // Use the smaller of dx or dy to ensure 45-degree angle
      const minDelta = Math.min(dx, dy);
      e.pointer.x = start.x + (minDelta * signX);
      e.pointer.y = start.y + (minDelta * signY);
    }
  };
  
  // Function to straighten the last drawn line
  const straightenLastLine = () => {
    if (!canvasRef.current || !lastPathRef.current || !drawingStartPointRef.current || !drawingEndPointRef.current) return;
    
    const canvas = canvasRef.current;
    const startPoint = drawingStartPointRef.current;
    const endPoint = drawingEndPointRef.current;
    
    // Remove the freehand path
    canvas.remove(lastPathRef.current);
    
    // Create a straight line instead
    const line = new fabricInstance.Line(
      [startPoint.x, startPoint.y, endPoint.x, endPoint.y], 
      {
        stroke: color,
        strokeWidth: brushSize,
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      }
    );
    
    // Add the straight line to canvas
    canvas.add(line);
    canvas.renderAll();
    
    // Update history
    addToHistory(canvas);
    
    // Reset refs
    lastPathRef.current = null;
    straightenTimerRef.current = null;
  };
  
  // Draw background (grid or lined paper)
  const drawBackground = (canvas: fabricInstance.Canvas, type: string) => {
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    
    if (type === 'math') {
      const gridSize = 40; 
      for (let i = 0; i < width; i += gridSize) {
        canvas.add(new fabricInstance.Line([i, 0, i, height], {
          stroke: '#e8e8e8', // Lighter grid color
          selectable: false,
          evented: false,
        }));
      }
      for (let i = 0; i < height; i += gridSize) {
        canvas.add(new fabricInstance.Line([0, i, width, i], {
          stroke: '#e8e8e8', // Lighter grid color
          selectable: false,
          evented: false,
        }));
      }
    } else {
      const lineHeight = 40;
      for (let i = lineHeight; i < height; i += lineHeight) {
        canvas.add(new fabricInstance.Line([0, i, width, i], {
          stroke: '#f0f0f8', // Lighter line color
          selectable: false,
          evented: false,
        }));
      }
    }
  };
  
  // Improved eraser implementation
  const enableEraser = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    setIsErasing(true);
    
    // Turn off drawing mode
    canvas.isDrawingMode = false;
    
    // Set up canvas for erasing via object selection
    canvas.selection = true;
    canvas.defaultCursor = 'crosshair';
    
    // Make all objects selectable (except background grid lines)
    canvas.forEachObject((obj) => {
      if (obj instanceof fabricInstance.Line && obj.stroke === '#e8e8e8' || obj.stroke === '#f0f0f8') {
        // These are the background grid/lined paper
        obj.selectable = false;
      } else {
        obj.selectable = true;
      }
    });
    
    // Add click handler for erasing objects
    const eraseHandler = (e: fabric.IEvent) => {
      if (!isErasing || !canvas) return;
      
      const target = canvas.findTarget(e.e as MouseEvent, false);
      
      if (target && !(target instanceof fabricInstance.Line && 
          (target.stroke === '#e8e8e8' || target.stroke === '#f0f0f8'))) {
        canvas.remove(target);
        canvas.renderAll();
      }
    };
    
    // Remove previous handlers if any
    canvas.off('mouse:down', eraseHandler);
    
    // Add the erase handler
    canvas.on('mouse:down', eraseHandler);
  };
  
  // Disable eraser mode
  const disableEraser = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    setIsErasing(false);
    
    canvas.defaultCursor = 'default';
    canvas.off('mouse:down'); // Remove the eraser handler
    
    // Reset the default selection behavior based on active tool
    if (activeTool === 'select') {
      canvas.selection = true;
    } else {
      canvas.selection = false;
    }
  };
  
  // Set up the pen tool with enhanced settings
  const enablePen = () => {
    if (!canvasRef.current || !customPenBrushRef.current) return;
    
    if (isErasing) {
      disableEraser();
    }
    
    const canvas = canvasRef.current;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = customPenBrushRef.current;
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = brushSize;
    
    // Apply smooth freehand drawing
    if (canvas.freeDrawingBrush instanceof fabricInstance.PencilBrush) {
      canvas.freeDrawingBrush.decimate = 8; // Smoothing factor
    }
  };
  
  // Set up the pencil tool (different from pen)
  const enablePencil = () => {
    if (!canvasRef.current || !pencilBrushRef.current) return;
    
    if (isErasing) {
      disableEraser();
    }
    
    const canvas = canvasRef.current;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = pencilBrushRef.current;
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = brushSize * 0.7; // Thinner than pen
    
    // Make it look like pencil
    // Opacity was an error here too. Pencil look is more about brush type/texture.
  };
  
  // Enhanced highlighter
  const enableHighlighter = () => {
    if (!canvasRef.current || !pencilBrushRef.current) return;
    
    if (isErasing) {
      disableEraser();
    }
    
    const canvas = canvasRef.current;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = pencilBrushRef.current;
    canvas.freeDrawingBrush.color = hexToRgba(color, 0.3);
    canvas.freeDrawingBrush.width = brushSize * 4; // Wider
  };
  
  // Tool handlers
  const handleToolChange = (tool: string) => {
    if (!canvasRef.current) return;
    
    // First disable eraser if it was active
    if (isErasing) {
      disableEraser();
    }
    
    setActiveTool(tool);
    const canvas = canvasRef.current;
    canvas.isDrawingMode = false;
    
    switch (tool) {
      case 'pen':
        enablePen();
        break;
      case 'pencil':
        enablePencil();
        break;
      case 'highlighter':
        enableHighlighter();
        break;
      case 'eraser':
        enableEraser();
        break;
      case 'rectangle':
        addShape('rect');
        setActiveTool('select');
        break;
      case 'circle':
        addShape('circle');
        setActiveTool('select');
        break;
      case 'arrow':
        addArrow();
        setActiveTool('select');
        break;
      case 'text':
        addText();
        setActiveTool('select');
        break;
      default: // select tool
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        break;
    }
  };
  
  const addShape = (shape: 'rect' | 'circle') => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let object;
    if (shape === 'rect') {
      object = new fabricInstance.Rect({
        left: 100, top: 100, fill: 'transparent', stroke: color, strokeWidth: 2, width: 100, height: 100,
      });
    } else {
      object = new fabricInstance.Circle({
        left: 100, top: 100, fill: 'transparent', stroke: color, strokeWidth: 2, radius: 50,
      });
    }
    canvas.add(object);
    canvas.setActiveObject(object);
    setActiveObject(object);
    canvas.renderAll();
  };
  
  const addArrow = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const line = new fabricInstance.Line([0, 0, 100, 0], { stroke: color, strokeWidth: 2 });
    const triangle = new fabricInstance.Triangle({ width: 15, height: 15, left: 100, top: 0, angle: 90, fill: color });
    const arrow = new fabricInstance.Group([line, triangle], { left: 100, top: 100 });
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
    setActiveObject(arrow);
    canvas.renderAll();
  };
  
  const addText = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const text = new fabricInstance.Textbox('Text', { left: 100, top: 100, fontFamily: 'Arial', fill: color, width: 200 });
    canvas.add(text);
    canvas.setActiveObject(text);
    setActiveObject(text);
    canvas.renderAll();
  };
  
  const handleDelete = () => {
    if (!canvasRef.current || !activeObject) return;
    const canvas = canvasRef.current;
    canvas.remove(activeObject);
    setActiveObject(null);
    canvas.renderAll();
  };
  
  const handleSave = async () => {
    if (!canvasRef.current || !onSave) return;
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      const json = canvas.toJSON(['selectable', 'evented']);
      await onSave(JSON.stringify(json));
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const toggleSnapToGrid = () => {
    if (!canvasRef.current) return;
    const newSnapToGrid = !snapToGrid;
    setSnapToGrid(newSnapToGrid);
    const canvas = canvasRef.current;
    if (newSnapToGrid) {
      const gridSize = note.background_type === 'math' ? 40 : 40;
      canvas.on('object:moving', function(e) {
        if (!e.target) return;
        const obj = e.target;
        // Ensure left and top are numbers before rounding
        obj.left = Math.round((obj.left || 0) / gridSize) * gridSize;
        obj.top = Math.round((obj.top || 0) / gridSize) * gridSize;
      });
    } else {
      canvas.off('object:moving');
    }
  };

  // Predefined colors for quick selection
  const predefinedColors = [
    '#000000', // Black
    '#ff0000', // Red
    '#0000ff', // Blue
    '#008000', // Green
    '#ffa500', // Orange
    '#800080', // Purple
    '#ff00ff', // Magenta
    '#ffff00', // Yellow
  ];
  
  return (
    <div className="note-editor card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h3>{note.title}</h3>
          <span className={`badge ${note.background_type === 'math' ? 'bg-info' : 'bg-success'}`}>
            {note.background_type === 'math' ? 'Math Grid' : 'Lined Paper'}
          </span>
        </div>
      </div>
      
      {!readOnly && (
        <div className="card-body border-bottom">
          <div className="row">
            <div className="col-md-8">
              <div className="btn-group me-2 mb-2">
                <button 
                  type="button" 
                  className={`btn btn-sm ${activeTool === 'select' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleToolChange('select')}
                  title="Select Tool"
                >
                  <i className="bi bi-cursor"></i> Select
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${activeTool === 'pen' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleToolChange('pen')}
                  title="Pen Tool"
                >
                  <i className="bi bi-pen"></i> Pen
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${activeTool === 'pencil' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleToolChange('pencil')}
                  title="Pencil Tool"
                >
                  <i className="bi bi-pencil"></i> Pencil
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${activeTool === 'highlighter' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleToolChange('highlighter')}
                  title="Highlighter Tool"
                >
                  <i className="bi bi-highlighter"></i> Highlighter
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${activeTool === 'eraser' || isErasing ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleToolChange('eraser')}
                  title="Eraser Tool"
                >
                  <i className="bi bi-eraser-fill"></i> Eraser
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${activeTool === 'text' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleToolChange('text')}
                  title="Text Tool"
                >
                  <i className="bi bi-fonts"></i> Text
                </button>
              </div>
              
              <div className="btn-group me-2 mb-2">
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleToolChange('rectangle')}
                  title="Add Rectangle"
                >
                  <i className="bi bi-square"></i> Rectangle
                </button>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleToolChange('circle')}
                  title="Add Circle"
                >
                  <i className="bi bi-circle"></i> Circle
                </button>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleToolChange('arrow')}
                  title="Add Arrow"
                >
                  <i className="bi bi-arrow-right"></i> Arrow
                </button>
              </div>
              
              <div className="btn-group me-2 mb-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleUndo}
                  disabled={historyPosition <= 0}
                  title="Undo"
                >
                  <i className="bi bi-arrow-counterclockwise"></i> Undo
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleRedo}
                  disabled={historyPosition >= history.length - 1}
                  title="Redo"
                >
                  <i className="bi bi-arrow-clockwise"></i> Redo
                </button>
                
                {activeObject && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleDelete}
                    title="Delete Selected Object"
                  >
                    <i className="bi bi-trash"></i> Delete
                  </button>
                )}
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="mb-2">
                <label className="me-2">Quick Colors:</label>
                <div className="d-flex flex-wrap">
                  {predefinedColors.map((clr) => (
                    <div
                      key={clr}
                      className="color-swatch me-1 mb-1"
                      style={{ 
                        backgroundColor: clr,
                        width: '25px',
                        height: '25px',
                        cursor: 'pointer',
                        border: color === clr ? '2px solid #333' : '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                      onClick={() => {
                        setColor(clr);
                        if (canvasRef.current && canvasRef.current.isDrawingMode && canvasRef.current.freeDrawingBrush) {
                          if (activeTool === 'pen' || activeTool === 'pencil') {
                            canvasRef.current.freeDrawingBrush.color = clr;
                          } else if (activeTool === 'highlighter') {
                            canvasRef.current.freeDrawingBrush.color = hexToRgba(clr, 0.3);
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="d-flex align-items-center mb-2">
                <label htmlFor="colorPicker" className="me-2">Custom Color:</label>
                <input 
                  type="color" 
                  id="colorPicker" 
                  value={color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setColor(newColor);
                    if (canvasRef.current && canvasRef.current.isDrawingMode && canvasRef.current.freeDrawingBrush) {
                      if (activeTool === 'pen' || activeTool === 'pencil') {
                        canvasRef.current.freeDrawingBrush.color = newColor;
                      } else if (activeTool === 'highlighter') {
                        canvasRef.current.freeDrawingBrush.color = hexToRgba(newColor, 0.3);
                      }
                    }
                  }}
                  className="form-control form-control-color"
                  title="Select Color"
                />
                
                <div className="ms-3">
                  <label htmlFor="brushSize" className="me-2">Size:</label>
                  <input 
                    type="range" 
                    id="brushSize" 
                    min="1" 
                    max="20" 
                    value={brushSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setBrushSize(newSize);
                      if (canvasRef.current && canvasRef.current.isDrawingMode && canvasRef.current.freeDrawingBrush) {
                        if (activeTool === 'pen') {
                          canvasRef.current.freeDrawingBrush.width = newSize;
                        } else if (activeTool === 'pencil') {
                          canvasRef.current.freeDrawingBrush.width = newSize * 0.7;
                        } else if (activeTool === 'highlighter') {
                          canvasRef.current.freeDrawingBrush.width = newSize * 4;
                        }
                      }
                    }}
                    className="form-range"
                    style={{ width: '100px' }}
                    title="Adjust Brush Size"
                  />
                </div>
              </div>
              
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="snapToGrid" 
                  checked={snapToGrid}
                  onChange={toggleSnapToGrid}
                />
                <label className="form-check-label" htmlFor="snapToGrid">
                  Snap to {note.background_type === 'math' ? 'grid' : 'lines'}
                </label>
              </div>
              
              <div className="alert alert-info mt-2 py-1 px-2" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-info-circle me-1"></i>
                Hold <strong>Shift</strong> while drawing to create perfectly straight lines
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="card-body">
        <div className="canvas-container mb-3" ref={canvasContainerRef}>
          <canvas id="note-canvas"></canvas>
        </div>
        
        {!readOnly && onSave && (
          <div className="d-flex justify-content-end">
            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}