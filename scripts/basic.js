(async () => {
  const MIN_DELAY = 60; // Shortest delay between keys in ms
  const MAX_DELAY = 140; // Longest delay between keys in ms
  const TARGET_DELAY = 120; // Average delay between keys in ms
  const REAL_ACCURACY = 100; // Percentage of keystrokes without uncorrected errors
  const FAKE_ACCURACY = 99; // Percentage of keystrokes without corrected typos

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const dynamicDelay = () => {
    const delay = TARGET_DELAY + (Math.random() * 40 - 20);
    return Math.max(MIN_DELAY, Math.min(delay, MAX_DELAY));
  };

  const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
  const getRandomWrongChar = (correctChar) => {
    let char = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return char === correctChar ? (char === "a" ? "b" : "a") : char;
  };

  const inputField =
    document.querySelector('input[aria-hidden="true"]') ||
    document.activeElement;
  if (!inputField) {
    console.warn("Input field not found.");
    return;
  }

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;

  const getChars = () => {
    const tokens = document.querySelectorAll(".token span.token_unit");
    return Array.from(tokens, (el) => {
      if (
        el.classList.contains("_enter") ||
        el.firstChild?.classList?.contains("_enter")
      ) {
        return "\n";
      }
      const char = el.textContent[0];
      return char === "\u00A0" ? " " : char;
    });
  };

  const characters = getChars();
  if (characters.length === 0) {
    console.warn("No text found to type.");
    return;
  }

  const Type = (char) => {
    inputField.focus();

    const isEnter = char === "\n";
    const isSpace = char === " ";
    const isBackspace = char === "Backspace";

    const eventKey = isEnter ? "Enter" : isSpace ? " " : char;
    const eventCode = isEnter
      ? "Enter"
      : isSpace
        ? "Space"
        : isBackspace
          ? "Backspace"
          : `Key${char.toUpperCase()}`;
    const eventKeyCode = isEnter
      ? 13
      : isSpace
        ? 32
        : isBackspace
          ? 8
          : char.charCodeAt(0);

    const eventOpts = {
      key: eventKey,
      code: eventCode,
      keyCode: eventKeyCode,
      which: eventKeyCode,
      bubbles: true,
      cancelable: true,
      isTrusted: true,
    };

    inputField.dispatchEvent(new KeyboardEvent("keydown", eventOpts));

    if (!isEnter) {
      const newValue = isBackspace
        ? inputField.value.slice(0, -1)
        : inputField.value + char;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputField, newValue);
      } else {
        inputField.value = newValue;
      }

      inputField.dispatchEvent(
        new InputEvent("input", {
          data: isBackspace ? null : char,
          inputType: isBackspace ? "deleteContentBackward" : "insertText",
          bubbles: true,
        }),
      );
    }

    inputField.dispatchEvent(new KeyboardEvent("keyup", eventOpts));
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (Math.random() * 100 > REAL_ACCURACY) {
      Type(getRandomWrongChar(char));
      await sleep(dynamicDelay());
      continue;
    }

    if (Math.random() * 100 > FAKE_ACCURACY) {
      Type(getRandomWrongChar(char));
      await sleep(dynamicDelay());
      Type("Backspace");
      await sleep(dynamicDelay() + 50);
    }

    Type(char);
    await sleep(dynamicDelay());
  }
})();
