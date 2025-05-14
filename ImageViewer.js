/**
 * ImageViewer - A plain vanilla web component for viewing, zooming, and panning images
 *
 * Features:
 * - Zoom in/out with buttons or shift+mousewheel
 * - Pan with mouse drag (slippy-map style)
 * - Preset zoom levels (Actual Size, Fit Image, Fit Width, 50%, 75%, 100%, 125%)
 * - Images stay constrained within bounds
 */
class ImageViewer extends HTMLElement {
  constructor() {
    super()

    // Component state
    this._scale = 1
    this._translateX = 0
    this._translateY = 0
    this._isDragging = false
    this._dragStartX = 0
    this._dragStartY = 0
    this._lastTranslateX = 0
    this._lastTranslateY = 0
    this._naturalWidth = 0
    this._naturalHeight = 0
    this._containerWidth = 0
    this._containerHeight = 0

    // No need to bind methods when using arrow functions
  }

  // Lifecycle methods
  connectedCallback() {
    // Create the DOM structure
    this._render()

    // Add event listeners
    this._addEventListeners()

    // Set initial image if src attribute exists
    if (this.hasAttribute("src")) {
      this._setImage(this.getAttribute("src"))
    }

    // Update container dimensions
    this._updateContainerDimensions()

    // Add resize observer to handle window resizing
    this._resizeObserver = new ResizeObserver(this._handleResize)
    this._resizeObserver.observe(this)
  }

  disconnectedCallback() {
    // Clean up event listeners and observers
    this._removeEventListeners()
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
    }
  }

  // Attribute changed callback for watching attributes
  static get observedAttributes() {
    return ["src"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "src" && oldValue !== newValue) {
      this._setImage(newValue)
    }
  }

  // Public API - getters and setters
  get src() {
    return this.getAttribute("src")
  }

  set src(value) {
    this.setAttribute("src", value)
  }

  // Private methods
  _render() {
    // Create the DOM structure
    this.innerHTML = `
      <header>
        <div class="zoom-controls">
          <div class="zoom-buttons">
            <button title="Zoom out" class="zoom-out">-</button>
            <span class="zoom-level">100%</span>
            <button title="Zoom in" class="zoom-in">+</button>
          </div>
          <div class="zoom-dropdown">
            <button class="zoom-dropdown-button">
              <span class="caret">▼</span>
              <span class="selected-option">Fit Image</span>
            </button>
            <div class="zoom-dropdown-content">
              <button data-zoom="actual">Actual Size</button>
              <button data-zoom="fit">Fit Image</button>
              <button data-zoom="width">Fit Width</button>
              <button data-zoom="0.5">50%</button>
              <button data-zoom="0.75">75%</button>
              <button data-zoom="1">100%</button>
              <button data-zoom="1.25">125%</button>
            </div>
          </div>
        </div>
      </header>
      <figure>
        <img alt="Image preview" />
      </figure>
    `

    // Cache DOM elements
    this._img = this.querySelector("img")
    this._zoomInBtn = this.querySelector(".zoom-in")
    this._zoomOutBtn = this.querySelector(".zoom-out")
    this._zoomLevelDisplay = this.querySelector(".zoom-level")
    this._dropdownButton = this.querySelector(".zoom-dropdown-button")
    this._dropdownContent = this.querySelector(".zoom-dropdown-content")
    this._selectedOptionDisplay = this.querySelector(".selected-option")
    this._figure = this.querySelector("figure")
    this._zoomOptions = this.querySelectorAll(".zoom-dropdown-content button")
  }

  _addEventListeners() {
    // Zoom controls
    this._zoomInBtn.addEventListener("click", () => this._zoomIn())
    this._zoomOutBtn.addEventListener("click", () => this._zoomOut())

    // Dropdown
    this._dropdownButton.addEventListener("click", () => this._toggleDropdown())
    this._zoomOptions.forEach((option) => {
      option.addEventListener("click", (e) => this._selectZoomOption(e))
    })

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !this._dropdownButton.contains(e.target) &&
        this._dropdownContent.classList.contains("show")
      ) {
        this._dropdownContent.classList.remove("show")
      }
    })

    // Mouse wheel zooming (with shift key)
    this.addEventListener("wheel", (e) => this._handleWheel(e), {
      passive: false,
    })

    // Panning
    this._img.addEventListener("mousedown", (e) => this._handleMouseDown(e))
    window.addEventListener("mousemove", (e) => this._handleMouseMove(e))
    window.addEventListener("mouseup", () => this._handleMouseUp())

    // Handle image load
    this._img.addEventListener("load", () => {
      this._naturalWidth = this._img.naturalWidth
      this._naturalHeight = this._img.naturalHeight
      this._resetZoom()
    })
  }

  _removeEventListeners() {
    this._zoomInBtn.removeEventListener("click", () => this._zoomIn())
    this._zoomOutBtn.removeEventListener("click", () => this._zoomOut())
    this._dropdownButton.removeEventListener(
      "click",
      () => this._toggleDropdown(),
    )
    this._zoomOptions.forEach((option) => {
      option.removeEventListener("click", (e) => this._selectZoomOption(e))
    })
    this.removeEventListener("wheel", (e) => this._handleWheel(e))
    this._img.removeEventListener("mousedown", (e) => this._handleMouseDown(e))
    window.removeEventListener("mousemove", (e) => this._handleMouseMove(e))
    window.removeEventListener("mouseup", () => this._handleMouseUp())
  }

  _setImage(src) {
    if (this._img) {
      this._img.src = src
    }
  }

  _handleWheel = (e) => {
    // Only zoom if shift key is pressed
    if (e.shiftKey) {
      e.preventDefault()

      // Determine zoom direction
      if (e.deltaY < 0) {
        this._zoomIn(e)
      } else {
        this._zoomOut(e)
      }
    }
  }

  _handleMouseDown = (e) => {
    // Start dragging
    this._isDragging = true
    this._dragStartX = e.clientX
    this._dragStartY = e.clientY
    this._lastTranslateX = this._translateX
    this._lastTranslateY = this._translateY

    // Change cursor
    this._img.classList.add("grabbing")

    // Prevent default behavior
    e.preventDefault()
  }

  _handleMouseMove = (e) => {
    if (!this._isDragging) return

    // Calculate new position
    const dx = e.clientX - this._dragStartX
    const dy = e.clientY - this._dragStartY

    this._translateX = this._lastTranslateX + dx
    this._translateY = this._lastTranslateY + dy

    // Apply the transform
    this._updateTransform()

    // Prevent default behavior
    e.preventDefault()
  }

  _handleMouseUp = () => {
    // Stop dragging
    this._isDragging = false

    // Restore cursor
    this._img.classList.remove("grabbing")

    // Ensure image stays within bounds
    this._constrainToBounds()
  }

  _handleResize = () => {
    // Update container dimensions
    this._updateContainerDimensions()

    // Reset zoom to maintain proper constraints
    this._resetZoom()
  }

  _updateContainerDimensions = () => {
    this._containerWidth = this._figure.clientWidth
    this._containerHeight = this._figure.clientHeight
  }

  _zoomIn = (e) => {
    // Increase scale
    const prevScale = this._scale
    this._scale = Math.min(this._scale * 1.2, 5) // Limit max zoom to 5x

    // If zooming with mouse wheel, zoom toward cursor position
    if (e instanceof MouseEvent) {
      this._zoomToPoint(e, prevScale)
    }

    // Update transform and display
    this._updateTransform()
    this._updateZoomLevelDisplay()

    // Ensure image stays within bounds
    this._constrainToBounds()
  }

  _zoomOut = (e) => {
    // Decrease scale
    const prevScale = this._scale
    this._scale = Math.max(this._scale / 1.2, 0.1) // Limit min zoom to 0.1x

    // If zooming with mouse wheel, zoom toward cursor position
    if (e instanceof MouseEvent) {
      this._zoomToPoint(e, prevScale)
    }

    // Update transform and display
    this._updateTransform()
    this._updateZoomLevelDisplay()

    // Ensure image stays within bounds
    this._constrainToBounds()
  }

  _zoomToPoint = (e, prevScale) => {
    // Get mouse position relative to image
    const rect = this._figure.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Adjust translation to zoom toward mouse position
    const scaleChange = this._scale / prevScale - 1
    const centerX = (mouseX - this._translateX) / prevScale
    const centerY = (mouseY - this._translateY) / prevScale

    this._translateX -= centerX * scaleChange * prevScale
    this._translateY -= centerY * scaleChange * prevScale
  }

  _toggleDropdown = () => {
    this._dropdownContent.classList.toggle("show")
  }

  _selectZoomOption = (e) => {
    // Get the selected zoom option
    const option = e.currentTarget
    const zoomValue = option.getAttribute("data-zoom")

    // Update selected option display
    this._selectedOptionDisplay.textContent = option.textContent

    // Apply the selected zoom
    this._applyZoomOption(zoomValue)

    // Hide dropdown
    this._dropdownContent.classList.remove("show")
  }

  _applyZoomOption = (zoomValue) => {
    // Reset translation first
    this._translateX = 0
    this._translateY = 0

    // Apply appropriate zoom based on option
    switch (zoomValue) {
      case "actual":
        // Set to actual size (1:1 pixel ratio)
        this._scale = 1
        break
      case "fit":
        // Fit entire image in view
        this._fitImage()
        break
      case "width":
        // Fit image width to container
        this._fitWidth()
        break
      default:
        // Apply percentage zoom
        this._scale = parseFloat(zoomValue)
    }

    // Update transform and display
    this._updateTransform()
    this._updateZoomLevelDisplay()

    // Ensure image stays within bounds
    this._constrainToBounds()
  }

  _fitImage = () => {
    // Calculate scale to fit the entire image within the container
    const scaleX = this._containerWidth / this._naturalWidth
    const scaleY = this._containerHeight / this._naturalHeight
    this._scale = Math.min(scaleX, scaleY)
  }

  _fitWidth = () => {
    // Calculate scale to fit the image width to the container width
    this._scale = this._containerWidth / this._naturalWidth
  }

  _resetZoom = () => {
    // Default to "Fit Image" when image loads or container resizes
    this._applyZoomOption("fit")
    this._selectedOptionDisplay.textContent = "Fit Image"
  }

  _updateTransform = () => {
    // Apply transform to the image
    this._img.style.transform =
      `translate(${this._translateX}px, ${this._translateY}px) scale(${this._scale})`
  }

  _updateZoomLevelDisplay = () => {
    // Update zoom level percentage display
    const percentage = Math.round(this._scale * 100)
    this._zoomLevelDisplay.textContent = `${percentage}%`
  }

  _constrainToBounds = () => {
    // Calculate scaled dimensions
    const scaledWidth = this._naturalWidth * this._scale
    const scaledHeight = this._naturalHeight * this._scale

    // Calculate bounds
    const maxX = Math.max(0, (scaledWidth - this._containerWidth) / 2)
    const maxY = Math.max(0, (scaledHeight - this._containerHeight) / 2)

    // Constrain translation within bounds
    this._translateX = Math.min(Math.max(this._translateX, -maxX), maxX)
    this._translateY = Math.min(Math.max(this._translateY, -maxY), maxY)

    // Apply constrained transform
    this._updateTransform()
  }
}

// Register the custom element
customElements.define("image-viewer", ImageViewer)

export { ImageViewer }
