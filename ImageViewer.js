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
    this.scale = 1
    this.translateX = 0
    this.translateY = 0
    this.isDragging = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.lastTranslateX = 0
    this.lastTranslateY = 0
    this.naturalWidth = 0
    this.naturalHeight = 0
    this.containerWidth = 0
    this.containerHeight = 0

    // No need to bind methods when using arrow functions
  }

  // Lifecycle methods
  connectedCallback() {
    // Create the DOM structure
    this.render()

    // Add event listeners
    this.addEventListeners()

    // Set initial image if src attribute exists
    if (this.hasAttribute("src")) {
      this.setImage(this.getAttribute("src"))
    }

    // Update container dimensions
    this.updateContainerDimensions()

    // Add resize observer to handle window resizing
    this.resizeObserver = new ResizeObserver(this.handleResize)
    this.resizeObserver.observe(this)
  }

  disconnectedCallback() {
    // Clean up event listeners and observers
    this.removeEventListeners()
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }

  // Attribute changed callback for watching attributes
  static get observedAttributes() {
    return ["src"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "src" && oldValue !== newValue) {
      this.setImage(newValue)
    }
  }

  // Public API - getters and setters
  get src() {
    return this.getAttribute("src")
  }

  set src(value) {
    this.setAttribute("src", value)
  }

  // Component methods
  render = () => {
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
    this.img = this.querySelector("img")
    this.zoomInBtn = this.querySelector(".zoom-in")
    this.zoomOutBtn = this.querySelector(".zoom-out")
    this.zoomLevelDisplay = this.querySelector(".zoom-level")
    this.dropdownButton = this.querySelector(".zoom-dropdown-button")
    this.dropdownContent = this.querySelector(".zoom-dropdown-content")
    this.selectedOptionDisplay = this.querySelector(".selected-option")
    this.figure = this.querySelector("figure")
    this.zoomOptions = this.querySelectorAll(".zoom-dropdown-content button")
  }

  addEventListeners = () => {
    // Store event handler references for later removal
    this.zoomInHandler = () => this.zoomIn()
    this.zoomOutHandler = () => this.zoomOut()
    this.toggleDropdownHandler = () => this.toggleDropdown()
    this.selectZoomOptionHandler = (e) => this.selectZoomOption(e)
    this.wheelHandler = (e) => this.handleWheel(e)
    this.mouseDownHandler = (e) => this.handleMouseDown(e)
    this.mouseMoveHandler = (e) => this.handleMouseMove(e)
    this.mouseUpHandler = () => this.handleMouseUp()

    // Zoom controls
    this.zoomInBtn.addEventListener("click", this.zoomInHandler)
    this.zoomOutBtn.addEventListener("click", this.zoomOutHandler)

    // Dropdown
    this.dropdownButton.addEventListener("click", this.toggleDropdownHandler)
    this.zoomOptions.forEach((option) => {
      option.addEventListener("click", this.selectZoomOptionHandler)
    })

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !this.dropdownButton.contains(e.target) &&
        this.dropdownContent.classList.contains("show")
      ) {
        this.dropdownContent.classList.remove("show")
      }
    })

    // Mouse wheel zooming (with shift key)
    this.addEventListener("wheel", this.wheelHandler, { passive: false })

    // Panning
    this.img.addEventListener("mousedown", this.mouseDownHandler)
    window.addEventListener("mousemove", this.mouseMoveHandler)
    window.addEventListener("mouseup", this.mouseUpHandler)

    // Handle image load
    this.img.addEventListener("load", () => {
      this.naturalWidth = this.img.naturalWidth
      this.naturalHeight = this.img.naturalHeight
      this.resetZoom()
    })
  }

  removeEventListeners = () => {
    this.zoomInBtn.removeEventListener("click", this.zoomInHandler)
    this.zoomOutBtn.removeEventListener("click", this.zoomOutHandler)
    this.dropdownButton.removeEventListener("click", this.toggleDropdownHandler)
    this.zoomOptions.forEach((option) => {
      option.removeEventListener("click", this.selectZoomOptionHandler)
    })
    this.removeEventListener("wheel", this.wheelHandler)
    this.img.removeEventListener("mousedown", this.mouseDownHandler)
    window.removeEventListener("mousemove", this.mouseMoveHandler)
    window.removeEventListener("mouseup", this.mouseUpHandler)
  }

  setImage = (src) => {
    if (this.img) {
      this.img.src = src
    }
  }

  handleWheel = (e) => {
    // Only zoom if shift key is pressed
    if (e.shiftKey) {
      e.preventDefault()

      // Get mouse position relative to the container
      const rect = this.figure.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate zoom factor based on wheel direction
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9

      // Zoom to the point where the mouse is
      this.zoomToPoint(mouseX, mouseY, zoomFactor)
    }
  }

  handleMouseDown = (e) => {
    // Start dragging
    this.isDragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.lastTranslateX = this.translateX
    this.lastTranslateY = this.translateY

    // Change cursor
    this.img.classList.add("grabbing")

    // Prevent default behavior
    e.preventDefault()
  }

  handleMouseMove = (e) => {
    if (!this.isDragging) return

    // Calculate new position
    const dx = e.clientX - this.dragStartX
    const dy = e.clientY - this.dragStartY

    this.translateX = this.lastTranslateX + dx
    this.translateY = this.lastTranslateY + dy

    // Apply the transform
    this.updateTransform()

    // Prevent default behavior
    e.preventDefault()
  }

  handleMouseUp = () => {
    // Stop dragging
    this.isDragging = false

    // Restore cursor
    this.img.classList.remove("grabbing")

    // Ensure image stays within bounds
    this.constrainToBounds()
  }

  handleResize = () => {
    // Update container dimensions
    this.updateContainerDimensions()

    // Reset zoom to maintain proper constraints
    this.resetZoom()
  }

  updateContainerDimensions = () => {
    this.containerWidth = this.figure.clientWidth
    this.containerHeight = this.figure.clientHeight
  }

  zoomIn = (e) => {
    if (e instanceof MouseEvent) {
      // Get mouse position relative to container for zoom origin
      const rect = this.figure.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      this.zoomToPoint(mouseX, mouseY, 1.2)
    } else {
      // Default to center zoom if no mouse event
      this.zoomToPoint(this.containerWidth / 2, this.containerHeight / 2, 1.2)
    }
  }

  zoomOut = (e) => {
    if (e instanceof MouseEvent) {
      // Get mouse position relative to container for zoom origin
      const rect = this.figure.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      this.zoomToPoint(mouseX, mouseY, 0.8)
    } else {
      // Default to center zoom if no mouse event
      this.zoomToPoint(this.containerWidth / 2, this.containerHeight / 2, 0.8)
    }
  }

  zoomToPoint = (pointX, pointY, factor) => {
    // Store the original scale
    const prevScale = this.scale

    // Calculate new scale with limits
    if (factor > 1) {
      this.scale = Math.min(this.scale * factor, 5) // Limit max zoom to 5x
    } else {
      this.scale = Math.max(this.scale * factor, 0.1) // Limit min zoom to 0.1x
    }

    // Find the point on the original image that corresponds to the mouse position
    // First convert screen coordinates to image-relative coordinates
    const imagePointX = (pointX - this.translateX) / prevScale
    const imagePointY = (pointY - this.translateY) / prevScale

    // Calculate where this point would be after scaling
    const newScreenPointX = imagePointX * this.scale
    const newScreenPointY = imagePointY * this.scale

    // Adjust translation to keep the point under the cursor
    this.translateX = pointX - newScreenPointX
    this.translateY = pointY - newScreenPointY

    // Update transform and display
    this.updateTransform()
    this.updateZoomLevelDisplay()

    // Ensure image stays within bounds
    this.constrainToBounds()
  }

  toggleDropdown = () => {
    this.dropdownContent.classList.toggle("show")
  }

  selectZoomOption = (e) => {
    // Get the selected zoom option
    const option = e.currentTarget
    const zoomValue = option.getAttribute("data-zoom")

    // Update selected option display
    this.selectedOptionDisplay.textContent = option.textContent

    // Apply the selected zoom
    this.applyZoomOption(zoomValue)

    // Hide dropdown
    this.dropdownContent.classList.remove("show")
  }

  applyZoomOption = (zoomValue) => {
    // Calculate center point for zooming
    const centerX = this.containerWidth / 2
    const centerY = this.containerHeight / 2

    // Apply appropriate zoom based on option
    switch (zoomValue) {
      case "actual":
        // Set to actual size (1:1 pixel ratio)
        this.scale = 1
        break
      case "fit":
        // Fit entire image in view
        this.fitImage()
        break
      case "width":
        // Fit image width to container
        this.fitWidth()
        break
      default:
        // Apply percentage zoom
        this.scale = parseFloat(zoomValue)
    }

    // Reset translation to center
    this.translateX = centerX - (this.naturalWidth * this.scale) / 2
    this.translateY = centerY - (this.naturalHeight * this.scale) / 2

    // Update transform and display
    this.updateTransform()
    this.updateZoomLevelDisplay()

    // Ensure image stays within bounds
    this.constrainToBounds()
  }

  fitImage = () => {
    // Calculate scale to fit the entire image within the container
    const scaleX = this.containerWidth / this.naturalWidth
    const scaleY = this.containerHeight / this.naturalHeight
    this.scale = Math.min(scaleX, scaleY)
  }

  fitWidth = () => {
    // Calculate scale to fit the image width to the container width
    this.scale = this.containerWidth / this.naturalWidth
  }

  resetZoom = () => {
    // Default to "Fit Image" when image loads or container resizes
    this.applyZoomOption("fit")
    this.selectedOptionDisplay.textContent = "Fit Image"
  }

  updateTransform = () => {
    // Apply transform to the image
    this.img.style.transform =
      `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
  }

  updateZoomLevelDisplay = () => {
    // Update zoom level percentage display
    const percentage = Math.round(this.scale * 100)
    this.zoomLevelDisplay.textContent = `${percentage}%`
  }

  constrainToBounds = () => {
    // Calculate scaled dimensions
    const scaledWidth = this.naturalWidth * this.scale
    const scaledHeight = this.naturalHeight * this.scale

    // If image is smaller than container, center it
    if (scaledWidth <= this.containerWidth) {
      this.translateX = (this.containerWidth - scaledWidth) / 2
    } else {
      // Otherwise ensure the image doesn't show empty space on either side
      const maxX = 0
      const minX = this.containerWidth - scaledWidth
      this.translateX = Math.min(Math.max(this.translateX, minX), maxX)
    }

    if (scaledHeight <= this.containerHeight) {
      this.translateY = (this.containerHeight - scaledHeight) / 2
    } else {
      // Otherwise ensure the image doesn't show empty space on top or bottom
      const maxY = 0
      const minY = this.containerHeight - scaledHeight
      this.translateY = Math.min(Math.max(this.translateY, minY), maxY)
    }

    // Apply constrained transform
    this.updateTransform()
  }
}

// Register the custom element
customElements.define("image-viewer", ImageViewer)
