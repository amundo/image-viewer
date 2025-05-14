export class ImageViewer extends HTMLElement {
  scale = 1
  translate = { x: 0, y: 0 }
  isDragging = false
  lastPointer = { x: 0, y: 0 }

  static observedAttributes = ['src']

  constructor() {
    super()
  }

  connectedCallback() {
    this.render()
    this.attachEvents()
    this.updateSrc()
    this.updateTransform()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'src') this.updateSrc()
  }

  render() {
    this.innerHTML = `
      <header class="controls"></header>
      <figure>
        <img>
      </figure>
    `
    this.figure = this.querySelector('figure')
    this.img = this.querySelector('img')

  }

  attachEvents() {
    this.figure.addEventListener('wheel', this.onWheel, { passive: false })
    this.figure.addEventListener('mousedown', this.onPointerDown)
    window.addEventListener('mousemove', this.onPointerMove)
    window.addEventListener('mouseup', this.onPointerUp)
  }

  updateSrc = () => {
    const src = this.getAttribute('src')
    if (src && this.img) {
      this.img.src = src
    }
  }

  onWheel = (e) => {
    e.preventDefault()

    const rect = this.figure.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newScale = this.scale * zoomFactor

    const imgX = (mouseX - this.translate.x) / this.scale
    const imgY = (mouseY - this.translate.y) / this.scale

    this.translate.x = mouseX - imgX * newScale
    this.translate.y = mouseY - imgY * newScale
    this.scale = newScale

    this.updateTransform()
  }

  onPointerDown = (e) => {
    this.isDragging = true
    this.lastPointer = { x: e.clientX, y: e.clientY }
    this.figure.classList.add('dragging')
  }

  onPointerMove = (e) => {
    if (!this.isDragging) return

    const dx = e.clientX - this.lastPointer.x
    const dy = e.clientY - this.lastPointer.y

    this.translate.x += dx
    this.translate.y += dy

    this.lastPointer = { x: e.clientX, y: e.clientY }

    this.updateTransform()
  }

  onPointerUp = () => {
    this.isDragging = false
    this.figure.classList.remove('dragging')
  }

  updateTransform = () => {
    this.img.style.transform = `translate(${this.translate.x}px, ${this.translate.y}px) scale(${this.scale})`
  }
}

customElements.define('image-viewer', ImageViewer)
