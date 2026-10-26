graph TD
    A[Project Definition] --> B{Rendering Service (Node.js)}
    B -- "Launch Headless Browser" --> C[Playwright Browser Instance]
    C --> D[Client-side Renderer HTML/JS]
    D -- "Load Project Data, Init Konva/GSAP/Three.js" --> E[Scene Graph & Animation Timeline]

    B -- "Loop: For each frame" --> F(Calculate timeMs)
    F --> G{Call renderFrame(timeMs) via page.evaluate()}
    G --> E
    E -- "Update Scene to timeMs" --> H[Render to Offscreen Canvas]
    H -- "Image Buffer (PNG/JPEG)" --> G
    G -- "Receive Image Buffer" --> I[Save Frame to Temp Directory]
    I --> B
    B -- "All Frames Rendered" --> J(Close Playwright Browser)

    I -- "Frame Sequence" --> K(FFmpeg Encoding)
    L(Mixed Audio Track) --> K
    K -- "Final Video File" --> M[Output Storage]