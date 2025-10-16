
function splitText(element) {
    const text = element.textContent;
    element.textContent = "";
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
        const span = document.createElement("span");
        span.classList.add("char");
        span.textContent = ch;
        element.appendChild(span);
    });
}

function runSplitText() {
    document.querySelectorAll(".split-text").forEach(el => {
        splitText(el);
        setTimeout(() => {
            el.querySelectorAll("span.char").forEach((span, idx) => {
                span.style.transitionDelay = (idx * 0.03) + "s";
                span.style.opacity = "1";
                span.style.transform = "translateY(0)";
            });
        }, 50);
    });
}

function runBlurText() {
    document.querySelectorAll(".blur-text").forEach(el => {
        setTimeout(() => {
            el.classList.add("active");
        }, 100);
    });
}

function runTrailText() {
    document.querySelectorAll(".trail-text").forEach(el => {
        splitText(el);
        setTimeout(() => {
            el.classList.add("active");
        }, 50);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    runSplitText();
    runBlurText();
    runTrailText();
});
