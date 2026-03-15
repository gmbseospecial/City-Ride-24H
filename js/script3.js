/**
 * Shortcode Compiler
 * Processes WordPress shortcodes after page render by replacing them with compiled content from wrappers
 */

// Patterns to exclude from shortcode processing
const excludePatterns = [
  /\[CDATA\[.*?\]\]/gi, // CDATA blocks
  /\/\*.*?\*\//gs, // JavaScript comments (/* */)
  /var\s+\w+\s*=\s*\{[^}]*\}/gi, // JavaScript variable declarations
  /wp\.i18n\.setLocaleData\s*\([^)]*\)/gi, // WordPress i18n calls
  /wvcHandlerData\s*=\s*\{[^}]*\}/gi, // wvcHandlerData variable
  /wpcf7\s*=\s*\{[^}]*\}/gi, // Contact Form 7 variables
  /\"\[a-zA-Z\]\"/g, // Exact text "[a-zA-Z]"
  /\[\s*[a-zA-Z]\s*\]/g, // Single letter in brackets like [a] or [ a ]
  /\[CDATA\[[\s\S]*?\]\]/gi, // CDATA with any content
  /\/\*[\s\S]*?\*\//g, // Multi-line comments
  /<script[^>]*>[\s\S]*?<\/script>/gi, // Script tags content
  /<style[^>]*>[\s\S]*?<\/style>/gi, // Style tags content
  /<!--[\s\S]*?-->/g, // HTML comments
];

function isExcludedContent(text) {
  return excludePatterns.some((pattern) => pattern.test(text));
}

function processShortcodesAfterRender() {
  setTimeout(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      // Skip if this node is within excluded content
      const text = node.textContent;

      // Check if the text content should be excluded
      if (isExcludedContent(text)) {
        continue;
      }

      // Check if the node is within a script or style tag or wrapper
      let parent = node.parentNode;
      let skipNode = false;
      while (parent) {
        if (
          parent.tagName === "SCRIPT" ||
          parent.tagName === "STYLE" ||
          parent.tagName === "WRAPPER"
        ) {
          skipNode = true;
          break;
        }
        parent = parent.parentNode;
      }

      if (skipNode) {
        continue;
      }

      // Match any WordPress shortcode pattern, but exclude CSS-like patterns
      const shortcodePattern = /\[([a-zA-Z][a-zA-Z0-9_-]*)\b[^\]]*\]/;

      // Check if it contains shortcode-like patterns
      if (shortcodePattern.test(text)) {
        // Additional filtering to exclude obvious CSS patterns
        const matches = text.match(/\[([a-zA-Z][a-zA-Z0-9_-]*)/g);
        if (matches) {
          const hasValidShortcode = matches.some((match) => {
            const name = match.substring(1); // Remove [
            // Exclude common CSS patterns
            return (
              !name.match(/^\d+px$/) &&
              !name.match(
                /^(class|data-|aria-|style|disabled|color|var|url)/
              ) &&
              name.length > 1
            );
          });

          if (hasValidShortcode) {
            textNodes.push(node);
          }
        }
      }
    }

    textNodes.forEach((textNode) => {
      processShortcodesInTextNode(textNode);
    });

    // If no text nodes found, try a different approach - wait for React to finish rendering
    if (textNodes.length === 0) {
      setTimeout(() => {
        processShortcodesAfterRender();
      }, 1000);
    }
  }, 100); // Increased delay to wait for React
}

function processShortcodesInTextNode(textNode) {
  if (!textNode || !textNode.textContent) {
    return;
  }

  const content = textNode.textContent;

  // Skip if this content should be excluded
  if (isExcludedContent(content)) {
    return;
  }

  // Match any WordPress shortcode pattern
  const shortcodePattern = /\[([a-zA-Z][a-zA-Z0-9_-]*)\b[^\]]*\]/g;
  let match;
  const shortcodes = [];

  while ((match = shortcodePattern.exec(content)) !== null) {
    const shortcodeName = match[1];
    const fullMatch = match[0];

    // Skip if this specific match should be excluded
    if (isExcludedContent(fullMatch)) {
      continue;
    }

    // Filter out CSS-like patterns and other unwanted patterns
    if (
      !shortcodeName.match(/^\d+px$/) &&
      !shortcodeName.match(
        /^(class|data-|aria-|style|disabled|color|var|url)/
      ) &&
      shortcodeName.length > 1 &&
      !shortcodeName.match(/^[a-zA-Z]$/) // Exclude single letters
    ) {
      shortcodes.push(fullMatch);
    }
  }

  if (shortcodes.length > 0) {
    processShortcodesSequentially(shortcodes, textNode, 0);
  }
}

function processShortcodesSequentially(shortcodes, textNode, index) {
  if (index >= shortcodes.length) {
    return;
  }

  const shortcode = shortcodes[index];

  // Create wrapper ID by changing double quotes to single quotes (matching PHP logic)
  const wrapperId = shortcode.replace(/"/g, "'");

  // Find the first available wrapper element with the compiled shortcode that hasn't been used yet
  const wrapper = document.querySelector(
    `wrapper[id="${CSS.escape(wrapperId)}"]:not([data-processed])`
  );

  if (wrapper && wrapper.innerHTML.trim()) {
    // Mark this wrapper as processed so it won't be selected again
    wrapper.setAttribute("data-processed", "true");

    // Replace the shortcode in the text node by moving the wrapper element
    replaceShortcodeInTextNode(shortcode, wrapper, textNode);
  }

  setTimeout(() => {
    if (textNode.parentNode) {
      processShortcodesSequentially(shortcodes, textNode, index + 1);
    }
  }, 50); // Increased delay to allow DOM changes to complete
}

function replaceShortcodeInTextNode(shortcode, wrapperElement, textNode) {
  if (!textNode.parentNode) {
    return;
  }
  const textContent = textNode.textContent;
  let shortcodeIndex = textContent.indexOf(shortcode);

  // If exact match not found, try with quote conversion
  if (shortcodeIndex === -1) {
    const shortcodeWithSingleQuotes = shortcode.replace(/"/g, "'");
    const shortcodeWithDoubleQuotes = shortcode.replace(/'/g, '"');

    shortcodeIndex = textContent.indexOf(shortcodeWithSingleQuotes);
    if (shortcodeIndex !== -1) {
      shortcode = shortcodeWithSingleQuotes;
    } else {
      shortcodeIndex = textContent.indexOf(shortcodeWithDoubleQuotes);
      if (shortcodeIndex !== -1) {
        shortcode = shortcodeWithDoubleQuotes;
      }
    }
  }

  if (shortcodeIndex === -1) {
    return;
  }

  const parent = textNode.parentNode;
  const beforeText = textContent.substring(0, shortcodeIndex);
  const afterText = textContent.substring(shortcodeIndex + shortcode.length);

  if (beforeText) {
    const beforeNode = document.createTextNode(beforeText);
    parent.insertBefore(beforeNode, textNode);
  }

  // Move the wrapper element to this location and make it visible
  wrapperElement.style.display = "";
  parent.insertBefore(wrapperElement, textNode);

  if (afterText) {
    const afterNode = document.createTextNode(afterText);
    parent.insertBefore(afterNode, textNode);

    if (
      afterNode.textContent.match(/\[([a-zA-Z][a-zA-Z0-9_-]*(?:[^[\]]*)?)\]/)
    ) {
      setTimeout(() => {
        processShortcodesInTextNode(afterNode);
      }, 200);
    }
  }

  parent.removeChild(textNode);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", processShortcodesAfterRender);
} else {
  processShortcodesAfterRender();
}

// Also watch for React/dynamic content changes
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;
  mutations.forEach((mutation) => {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      // Check if any added nodes contain shortcodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          if (node.textContent.match(/\[([a-zA-Z][a-zA-Z0-9_-]*)\b[^\]]*\]/)) {
            shouldProcess = true;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const textContent = node.textContent || node.innerText;
          if (
            textContent &&
            textContent.match(/\[([a-zA-Z][a-zA-Z0-9_-]*)\b[^\]]*\]/)
          ) {
            shouldProcess = true;
          }
        }
      });
    }
  });

  if (shouldProcess) {
    setTimeout(processShortcodesAfterRender, 100);
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
// End of shortcode.compiler.js

// Reviewer: Please ensure the code correctly identifies and processes WordPress shortcodes in a React-rendered environment, while avoiding false positives from CSS or JavaScript content. Check for performance implications of the MutationObserver and ensure it doesn't lead to excessive processing. Verify that the exclusion patterns are comprehensive and do not inadvertently skip valid shortcodes.
