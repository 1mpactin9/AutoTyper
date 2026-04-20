(async () => {
  const TARGET_WPM = 85; // Target words per minute
  const REAL_ACCURACY = 97; // Percentage of keystrokes without uncorrected errors
  const FAKE_ACCURACY = 100; // Percentage of keystrokes without corrected typos

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  const N = characters.length;
  const fakeValid = Math.floor((FAKE_ACCURACY / 100) * N);
  const realValid = Math.min(Math.floor((REAL_ACCURACY / 100) * N), fakeValid);

  const actions =[
    ...Array(realValid).fill("A"),
    ...Array(N - fakeValid).fill("B"),
    ...Array(fakeValid - realValid).fill("C"),
  ];

  for (let i = actions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[actions[i], actions[j]] = [actions[j], actions[i]];
  }

  const sequence =[];
  let totalWeight = 0;

  for (let i = 0; i < N; i++) {
    const char = characters[i];
    if (actions[i] === "A") {
      sequence.push({ char, w: 1 });
      totalWeight += 1;
    } else if (actions[i] === "B") {
      sequence.push({ char: getRandomWrongChar(char), w: 1 });
      totalWeight += 1;
    } else {
      sequence.push({ char: getRandomWrongChar(char), w: 0.8 });
      sequence.push({ char: "Backspace", w: 0.4 });
      sequence.push({ char, w: 1.5 });
      totalWeight += 2.7;
    }
  }

  const targetDurationMs = (realValid * 12000) / TARGET_WPM;
  let expectedTime = Date.now();

  for (let i = 0; i < sequence.length; i++) {
    if (i === 0) {
      expectedTime = Date.now();
    } else {
      const delay = (sequence[i].w / totalWeight) * targetDurationMs * (1 + (Math.random() * 0.4 - 0.2));
      expectedTime += delay;
      const wait = expectedTime - Date.now();
      if (wait > 0) await sleep(wait);
    }
    Type(sequence[i].char);
  }
})();