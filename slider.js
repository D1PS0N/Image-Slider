class ImageSlider {
  constructor(root) {
    this.root = typeof root === "string" ? document.querySelector(root) : root;
    if (!this.root) throw new Error("ImageSlider: container not found.");

    this.track = this.root.querySelector(".slider-track");
    this.prevBtn = this.root.querySelector(".slider-arrow--prev");
    this.nextBtn = this.root.querySelector(".slider-arrow--next");
    this.dotsWrap = this.root.querySelector(".slider-dots");

    this.realSlides = Array.from(this.track.children);
    this.slideCount = this.realSlides.length;
    this.allSlides = this.realSlides;

    this.currentIndex = 1;      // position in the track (index 0 is the leading clone)
    this.isAnimating = false;
    this.queued = null;         // latest click received while a slide was moving
    this.fallbackTimer = null;
    this.dots = [];

    // One slide (or none) needs no controls and no looping
    if (this.slideCount < 2) {
      this.prevBtn.hidden = true;
      this.nextBtn.hidden = true;
      this.dotsWrap.hidden = true;
      return;
    }

    this._buildClones();
    this._buildDots();
    this._bindEvents();
    this._setPosition(false);
    this._updateDots();
  }

  // Track layout: [clone of last] [1] [2] ... [N] [clone of first]
  _buildClones() {
    const firstClone = this.realSlides[0].cloneNode(true);
    const lastClone = this.realSlides[this.slideCount - 1].cloneNode(true);

    [firstClone, lastClone].forEach((clone) => {
      clone.setAttribute("aria-hidden", "true");
      clone.classList.add("slide--clone");
    });

    this.track.appendChild(firstClone);
    this.track.insertBefore(lastClone, this.realSlides[0]);

    // allSlides[0] and allSlides[N + 1] are the clones
    this.allSlides = Array.from(this.track.children);
  }

  _buildDots() {
    this.dotsWrap.innerHTML = "";
    this.dots = this.realSlides.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slider-dot";
      dot.dataset.index = String(index);
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      this.dotsWrap.appendChild(dot);
      return dot;
    });
  }

  _bindEvents() {
    this.prevBtn.addEventListener("click", () => this.prev());
    this.nextBtn.addEventListener("click", () => this.next());

    this.dotsWrap.addEventListener("click", (event) => {
      const dot = event.target.closest(".slider-dot");
      if (dot) this.goTo(Number(dot.dataset.index));
    });

    this.track.addEventListener("transitionend", (event) => {
      if (event.target === this.track && event.propertyName === "transform") {
        this._handleLoopReset();
      }
    });

    this.root.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") this.prev();
      if (event.key === "ArrowRight") this.next();
    });
  }

  // Move the track. animate = false snaps instantly (used by the loop reset).
  _setPosition(animate) {
    this.track.classList.toggle("no-transition", !animate);
    this.track.style.transform = `translateX(${-this.currentIndex * 100}%)`;
    if (!animate) void this.track.offsetWidth;   // apply the snap before transitions return
  }

  _updateDots() {
    const active = (this.currentIndex - 1 + this.slideCount) % this.slideCount;
    this.dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === active);
      dot.setAttribute("aria-current", index === active ? "true" : "false");
    });
  }

  // Run the action now, or remember the latest one until the slide stops moving
  _request(action) {
    if (this.isAnimating) {
      this.queued = action;
      return;
    }
    action();
  }

  _moveTo(index) {
    if (index === this.currentIndex) return;

    this.isAnimating = true;
    this.currentIndex = index;
    this._setPosition(true);
    this._updateDots();

    // Safety net in case "transitionend" never fires (hidden tab, reduced motion)
    const duration = parseFloat(getComputedStyle(this.track).transitionDuration) * 1000 || 0;
    clearTimeout(this.fallbackTimer);
    this.fallbackTimer = setTimeout(() => this._handleLoopReset(), duration + 80);
  }

  next() {
    this._request(() => this._moveTo(this.currentIndex + 1));
  }

  prev() {
    this._request(() => this._moveTo(this.currentIndex - 1));
  }

  // Jump directly to a real slide index (0-based), e.g. from a dot click
  goTo(realIndex) {
    if (realIndex < 0 || realIndex >= this.slideCount) return;
    this._request(() => this._moveTo(realIndex + 1));   // +1 for the leading clone
  }

  // Seamlessly wrap when the track has animated onto a cloned slide
  _handleLoopReset() {
    clearTimeout(this.fallbackTimer);
    if (!this.isAnimating) return;

    if (this.currentIndex === this.allSlides.length - 1) {
      // landed on the trailing clone of the first slide -> snap to the real one
      this.currentIndex = 1;
      this._setPosition(false);
    } else if (this.currentIndex === 0) {
      // landed on the leading clone of the last slide -> snap to the real one
      this.currentIndex = this.slideCount;
      this._setPosition(false);
    }

    this.isAnimating = false;

    if (this.queued) {
      const action = this.queued;
      this.queued = null;
      action();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.slider = new ImageSlider("#image-slider");
});
