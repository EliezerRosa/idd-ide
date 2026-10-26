graph TD
    A[User/Editor] --> B(Web-based Editor/Preview)
    B --> C(Project Management Module)
    C --> D(Asset Management Module)
    C --> E(Validation Module)

    C -- "Project Definition" --> F(Rendering Service)
    D -- "Asset Paths" --> F
    E -- "Validation Results" --> F

    F --> G(Playwright Headless Browser)
    G -- "Rendered Frames" --> F

    F --> H(Audio Integration Module)
    H -- "Mixed Audio Track" --> I(Video Encoding Module)

    F -- "Frame Sequence" --> I
    I -- "Final Video" --> J(Output Storage)
    I --> B -- "Preview" --> K(Review Interface)
    K --> E -- "Feedback" --> B