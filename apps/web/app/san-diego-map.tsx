import type {
  DispatchStaticMapMarkerTone,
  DispatchStaticMapPointSource,
} from "@pest-patrol/domain";

const markerToneClasses: Record<DispatchStaticMapMarkerTone, string> = {
  amber:
    "border-theme-background-surface bg-status-alert-warning-solid text-primitive-navy-950",
  emerald:
    "border-theme-background-surface bg-status-alert-success-solid text-theme-text-inverse",
  navy:
    "border-theme-background-surface bg-primitive-navy-800 text-theme-text-inverse",
  rose:
    "border-theme-background-surface bg-status-alert-danger-solid text-theme-text-inverse",
  sky:
    "border-theme-background-surface bg-status-alert-info-solid text-theme-text-inverse",
};

export function dispatchMapMarkerClassName(tone: DispatchStaticMapMarkerTone) {
  return markerToneClasses[tone];
}

export function mapPointSourceLabel(source: DispatchStaticMapPointSource) {
  return source === "service_location" ? "Service coordinates" : "Latest GPS";
}

export function SanDiegoMapBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 640 380"
    >
      <rect
        className="fill-primitive-navy-950"
        height="380"
        rx="24"
        width="640"
      />
      <path
        className="fill-primitive-slate-800"
        d="M214 0h426v380H244c-17-26-21-55-11-86 9-29 4-55-17-78-22-24-22-48 0-72 18-20 20-42 6-66-14-25-17-51-8-78z"
      />
      <path
        className="fill-primitive-navy-900"
        d="M401 0h239v380H457c-22-30-34-64-37-101-3-46 12-77 45-94 38-19 49-49 34-91-12-35-45-53-98-54z"
        opacity="0.78"
      />
      <path
        className="fill-primitive-slate-700"
        d="M460 20c56 12 102 36 138 72v288H489c-24-28-31-62-22-102 8-35 2-68-19-100-22-34-18-64 12-91 20-18 20-40 0-67z"
        opacity="0.38"
      />
      <path
        className="fill-primitive-sky-600"
        d="M214 0c-8 26-6 53 8 78 14 24 12 46-6 66-22 24-22 48 0 72 21 23 26 49 17 78-10 31-6 60 11 86h-69c-16-31-16-63 1-96 14-28 8-52-19-73-28-22-31-48-9-78 20-27 19-54-4-81-15-18-18-35-10-52z"
        opacity="0.32"
      />
      <path
        className="stroke-primitive-sky-200"
        d="M214 0c-8 26-6 53 8 78 14 24 12 46-6 66-22 24-22 48 0 72 21 23 26 49 17 78-10 31-6 60 11 86"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <path
        className="fill-primitive-sky-600"
        d="M204 175c28-13 61-4 72 20 13 30-15 59-57 57-37-2-60-22-51-47 5-14 17-24 36-30z"
        opacity="0.36"
      />
      <path
        className="stroke-primitive-sky-200"
        d="M204 175c28-13 61-4 72 20 13 30-15 59-57 57-37-2-60-22-51-47 5-14 17-24 36-30z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        className="fill-primitive-sky-600"
        d="M227 286c41-25 100-28 153-10 31 11 32 45 0 65-51 32-114 24-164 39-20-24-16-53 11-94z"
        opacity="0.31"
      />
      <path
        className="stroke-primitive-sky-200"
        d="M227 286c41-25 100-28 153-10 31 11 32 45 0 65-51 32-114 24-164 39-20-24-16-53 11-94z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        className="stroke-theme-text-inverse"
        d="M264 54l58-15 42 25 19 42-30 37 17 37-38 41 20 38-54 29-7 50-51-11-30 23-24-38 17-47-27-39 29-44-12-50 31-31z"
        opacity="0.58"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        className="stroke-theme-text-inverse"
        d="M240 213l36 20 24-14 36 12 43-18 39 15 39-17 58 6 34-25"
        opacity="0.35"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        className="stroke-primitive-slate-300"
        d="M268 19c29 52 30 111 3 178-22 55-16 105 20 151"
        opacity="0.42"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        className="stroke-primitive-slate-300"
        d="M330 18c38 57 46 111 25 160-23 52-14 104 26 156"
        opacity="0.38"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <g className="stroke-primitive-sky-200" opacity="0.62">
        <path
          d="M225 14c17 45 18 89 4 132-16 48-8 93 24 136 19 26 25 55 18 88"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M305 43c20 55 20 104 0 148-21 47-12 93 28 139"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M174 225c70-14 137-10 201 13 67 24 137 17 210-20"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M201 148c75 25 145 29 209 11 58-17 114-10 168 22"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M315 304c72-3 143-13 213-30 39-9 76-12 112-9"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </g>
      <g className="stroke-primitive-slate-300" opacity="0.26">
        <path
          d="M252 112c64 18 129 15 194-8"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M238 187c43 11 86 9 130-6"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M285 255c35 20 75 24 119 13"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M373 40c-8 38-4 75 13 111"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M472 80c-14 46-12 89 8 130"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </g>
      <g
        className="fill-primitive-slate-300 stroke-primitive-sky-200"
        strokeWidth="2"
      >
        <circle cx="225" cy="220" r="13" />
        <circle cx="411" cy="70" r="13" />
        <circle cx="332" cy="173" r="13" />
        <circle cx="512" cy="296" r="13" />
      </g>
      <g
        className="fill-primitive-navy-950 text-[10px] font-bold"
        textAnchor="middle"
      >
        <text x="225" y="224">
          8
        </text>
        <text x="411" y="74">
          78
        </text>
        <text x="332" y="177">
          52
        </text>
        <text x="512" y="300">
          94
        </text>
      </g>
      <g
        className="fill-theme-text-inverse stroke-primitive-navy-950 font-semibold"
        paintOrder="stroke"
        strokeWidth="3"
      >
        <text className="text-[12px]" x="178" y="16">
          Oceanside
        </text>
        <text className="text-[12px]" x="198" y="38">
          Carlsbad
        </text>
        <text className="text-[12px]" x="213" y="92">
          Encinitas
        </text>
        <text className="text-[12px]" x="310" y="38">
          San Marcos
        </text>
        <text className="text-[12px]" x="330" y="70">
          Escondido
        </text>
        <text className="text-[12px]" x="415" y="113">
          Ramona
        </text>
        <text className="text-[12px]" x="316" y="139">
          Poway
        </text>
        <text className="text-[12px]" x="348" y="187">
          Santee
        </text>
        <text className="text-[12px]" x="345" y="216">
          El Cajon
        </text>
        <text className="text-[12px]" x="310" y="236">
          La Mesa
        </text>
        <text className="text-[13px]" x="255" y="286">
          Chula Vista
        </text>
        <text className="text-[12px]" x="516" y="167">
          Descanso
        </text>
        <text className="text-[12px]" x="530" y="318">
          Tecate
        </text>
        <text className="text-[12px]" x="173" y="334">
          La Jolla
        </text>
        <text className="text-[10px]" x="178" y="213">
          Mission Bay
        </text>
        <text className="text-[10px]" x="216" y="342">
          Point Loma
        </text>
        <text className="text-[10px]" x="260" y="330">
          San Diego Bay
        </text>
        <text className="text-[11px]" x="118" y="100">
          Pacific
        </text>
        <text className="text-[10px]" x="258" y="164">
          I-5
        </text>
        <text className="text-[10px]" x="318" y="119">
          I-805
        </text>
        <text className="text-[10px]" x="426" y="92">
          I-15
        </text>
        <text className="text-[10px]" x="451" y="206">
          I-8
        </text>
      </g>
      <g
        className="fill-theme-text-inverse stroke-primitive-navy-950 font-bold"
        paintOrder="stroke"
        strokeWidth="4"
      >
        <text className="text-[30px]" x="208" y="254">
          San Diego
        </text>
        <text className="text-[28px]" x="282" y="344">
          Tijuana
        </text>
      </g>
    </svg>
  );
}
