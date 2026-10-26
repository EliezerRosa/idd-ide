graph TD
    A[Project Definition] --> B{Validation Module}
    B -- "Schema Validation (Zod)" --> C{Is Valid Schema?}
    C -- No --> D[Notify User: Schema Error]
    C -- Yes --> E{Asset Pre-flight Check}
    E -- "Missing/Corrupt Assets?" --> F[Notify User: Asset Error]
    E -- No --> G{Animation Logic Analysis}
    G -- "Animation Issues?" --> H[Suggest Corrections / Notify User]
    G -- No --> I(Generate Storyboard Preview)

    I --> J[Preview Storage]
    J --> K[Review Interface]
    K --> L{Reviewers Provide Feedback}
    L --> M{Approve / Reject?}
    M -- Reject --> A
    M -- Approve --> N(Full Quality Video Render Request)

    N --> O{Rendering Service}
    O -- "Render Time Anomalies?" --> P[Log Anomalies / Retry Frame]
    O -- No Anomalies --> Q(Final Video Output)
    P --> N -- "Self-Correction" --> O