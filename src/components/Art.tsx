export function ArenaArt() {
  return (
    <svg
      viewBox="0 0 600 420"
      role="img"
      aria-label="Um castelo de fantasia com bandeiras, montanhas e um escudo de conhecimento"
      className="arena-art"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#274e47" />
          <stop offset="1" stopColor="#163c37" />
        </linearGradient>
        <linearGradient id="stone" x2="1" y2="1">
          <stop stopColor="#f2d496" />
          <stop offset="1" stopColor="#c3975d" />
        </linearGradient>
      </defs>
      <circle cx="325" cy="195" r="174" fill="#285047" />
      <circle cx="416" cy="93" r="37" fill="#f2ca77" />
      <path
        d="m15 335 123-157 87 118 93-173 129 181 64-95 93 127"
        fill="#36604f"
      />
      <path
        d="m114 207 24-29 24 32-25-10zM290 172l28-49 35 50-36-15z"
        fill="#7d9975"
      />
      <ellipse
        cx="316"
        cy="364"
        rx="220"
        ry="28"
        fill="#102e2a"
        opacity=".65"
      />
      <g stroke="#17382f" strokeWidth="5" strokeLinejoin="round">
        <path d="M155 226h306v124H155z" fill="#b58a55" />
        <path d="M219 177h171v171H219z" fill="url(#stone)" />
        <path
          d="M211 166h37v20h25v-20h37v20h26v-20h37v20h25v31H211z"
          fill="#ebcb8c"
        />
        <path d="M147 203h65v146h-65zM399 203h65v146h-65z" fill="#d5ad72" />
        <path d="m137 202 43-76 43 76zM389 202l43-76 43 76z" fill="#cb7955" />
        <path d="M180 126V70m252 56V70" fill="none" />
        <path d="m180 70 56 11-56 17zM432 70l52 11-52 17z" fill="#e7b95a" />
        <path d="M273 349v-66a32 32 0 0 1 64 0v66z" fill="#345349" />
        <path d="M305 256v90m-25-60h49m-49 30h49" stroke="#15372f" />
        <path
          d="M171 233v27h17v-27a9 9 0 0 0-17 0M424 233v27h17v-27a9 9 0 0 0-17 0"
          fill="#37564b"
        />
        <path
          d="M246 224h26m70 0h24m-125 69h22m81 15h25m-211-19h26m228 25h30"
          stroke="#b48b56"
          strokeWidth="3"
        />
        <path d="m292 349-45 45h111l-33-45" fill="#b79a6c" />
        <g transform="translate(102 260) rotate(-17)">
          <path d="M0 0h77v57q-4 36-39 55Q3 91 0 57Z" fill="#e4b554" />
          <path d="M9 10h59v44q-3 29-30 47Q12 85 9 54Z" fill="#355d50" />
          <path
            d="m38 26-16 41h12l4-12 5 12h12z"
            fill="#f6dca0"
            stroke="none"
          />
        </g>
        <g transform="translate(465 277) rotate(24)">
          <path d="m0 0 6-38 6 38v62H0Z" fill="#f4e6bf" />
          <path d="M-15 63h42v10h-42z" fill="#e7b95a" />
          <path d="M2 73h9v26H2z" fill="#ac7050" />
        </g>
      </g>
      <g fill="#edcf8f">
        <path d="m89 110 3 9 9 3-9 3-3 9-3-9-9-3 9-3zM505 157l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM346 54l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <circle cx="112" cy="164" r="2" />
        <circle cx="489" cy="110" r="2" />
        <circle cx="245" cy="86" r="2" />
      </g>
      <path
        d="M52 362q20-58 39 0m417 0q15-63 27 0"
        fill="#63805a"
        stroke="#143b32"
        strokeWidth="4"
      />
    </svg>
  );
}
