/* @ds-bundle: {"namespace":"MinieraDS","components":[{"name":"BadgePuntata","sourcePath":"components/brand/BadgePuntata/BadgePuntata.jsx"},{"name":"Bottone","sourcePath":"components/core/Bottone/Bottone.jsx"},{"name":"Etichetta","sourcePath":"components/core/Etichetta/Etichetta.jsx"},{"name":"FasciaFirma","sourcePath":"components/brand/FasciaFirma/FasciaFirma.jsx"},{"name":"Marchio","sourcePath":"components/brand/Marchio/Marchio.jsx"},{"name":"RigaOspite","sourcePath":"components/eventi/RigaOspite/RigaOspite.jsx"},{"name":"Scheda","sourcePath":"components/core/Scheda/Scheda.jsx"},{"name":"SchedaEvento","sourcePath":"components/eventi/SchedaEvento/SchedaEvento.jsx"}],"sourceHashes":{"components/brand/BadgePuntata/BadgePuntata.jsx":"b2027ba16ada","components/brand/BadgePuntata/BadgePuntata.d.ts":"16fb219da06a","components/brand/BadgePuntata/BadgePuntata.prompt.md":"08c68023aa95","components/core/Bottone/Bottone.jsx":"b542e741b51c","components/core/Bottone/Bottone.d.ts":"76b0058a80c7","components/core/Bottone/Bottone.prompt.md":"9221cee7db12","components/core/Etichetta/Etichetta.jsx":"178ba56c53da","components/core/Etichetta/Etichetta.d.ts":"64b3fa5d4452","components/core/Etichetta/Etichetta.prompt.md":"94623c139f7e","components/brand/FasciaFirma/FasciaFirma.jsx":"27588b06419d","components/brand/FasciaFirma/FasciaFirma.d.ts":"d90877468f17","components/brand/FasciaFirma/FasciaFirma.prompt.md":"546b98f2e889","components/brand/Marchio/Marchio.jsx":"4c758f8a4c32","components/brand/Marchio/Marchio.d.ts":"22796f13d4c5","components/brand/Marchio/Marchio.prompt.md":"906f39362e07","components/eventi/RigaOspite/RigaOspite.jsx":"15158777b65e","components/eventi/RigaOspite/RigaOspite.d.ts":"aa7bb4afd1bf","components/eventi/RigaOspite/RigaOspite.prompt.md":"f160e145bb56","components/core/Scheda/Scheda.jsx":"53af3c21a9bc","components/core/Scheda/Scheda.d.ts":"914905d7e990","components/core/Scheda/Scheda.prompt.md":"16849da1fe35","components/eventi/SchedaEvento/SchedaEvento.jsx":"615e9750b60b","components/eventi/SchedaEvento/SchedaEvento.d.ts":"516cfcf29a26","components/eventi/SchedaEvento/SchedaEvento.prompt.md":"cc017d804cad"},"inlinedExternals":[],"builtBy":"cc-design-sync"} */
var MinieraDS = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx;
      module.exports.jsxs = jsxs;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs : jsx)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // index.js
  var index_exports = {};
  __export(index_exports, {
    BadgePuntata: () => BadgePuntata,
    Bottone: () => Bottone,
    Etichetta: () => Etichetta,
    FasciaFirma: () => FasciaFirma,
    Marchio: () => Marchio,
    RigaOspite: () => RigaOspite,
    Scheda: () => Scheda,
    SchedaEvento: () => SchedaEvento
  });
  init_define_import_meta_env();

  // components/core/Bottone.jsx
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim(), 1);
  var varianti = {
    primario: { background: "var(--accento, var(--arancio-500))", color: "var(--nero)", border: "2px solid transparent" },
    secondario: { background: "transparent", color: "var(--text-primary)", border: "2px solid var(--border-strong)" },
    piatto: { background: "transparent", color: "var(--text-accent)", border: "2px solid transparent" }
  };
  var misure = {
    sm: { padding: "8px 14px", fontSize: "var(--text-xs)" },
    md: { padding: "12px 20px", fontSize: "var(--text-sm)" },
    lg: { padding: "16px 28px", fontSize: "var(--text-md)" }
  };
  function Bottone({ variante = "primario", misura = "md", disabilitato = false, children, style, ...rest }) {
    const [premuto, setPremuto] = import_react.default.useState(false);
    const v = varianti[variante] || varianti.primario;
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        ...rest,
        disabled: disabilitato,
        onMouseDown: () => setPremuto(true),
        onMouseUp: () => setPremuto(false),
        onMouseLeave: () => setPremuto(false),
        style: {
          ...v,
          ...misures(misura),
          fontFamily: "var(--font-sans)",
          fontWeight: "var(--weight-bold)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          borderRadius: "var(--radius-md)",
          cursor: disabilitato ? "not-allowed" : "pointer",
          opacity: disabilitato ? 0.4 : 1,
          boxShadow: variante === "primario" && !premuto ? "var(--shadow-lift)" : "none",
          transform: premuto ? "translateY(2px)" : "none",
          transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
          ...style
        }
      },
      children
    );
  }
  function misures(m) {
    return misure[m] || misure.md;
  }

  // components/core/Etichetta.jsx
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim(), 1);
  function Etichetta({ tono = "accento", children, style, ...rest }) {
    const toni = {
      accento: { background: "var(--accento, var(--arancio-500))", color: "var(--nero)" },
      contorno: { background: "transparent", color: "var(--text-primary)", boxShadow: "inset 0 0 0 1px var(--border-hairline)" },
      piena: { background: "var(--crema-100)", color: "var(--blu-700)" }
    };
    return /* @__PURE__ */ import_react2.default.createElement(
      "span",
      {
        ...rest,
        style: {
          ...toni[tono] || toni.accento,
          display: "inline-block",
          font: "var(--type-label)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          padding: "6px 10px",
          ...style
        }
      },
      children
    );
  }

  // components/core/Scheda.jsx
  init_define_import_meta_env();
  var import_react3 = __toESM(require_react_shim(), 1);
  function Scheda({ rilievo = false, children, style, ...rest }) {
    return /* @__PURE__ */ import_react3.default.createElement(
      "div",
      {
        ...rest,
        style: {
          background: rilievo ? "var(--surface-raised)" : "transparent",
          border: "1px solid var(--border-hairline)",
          borderTop: "4px solid var(--accento, var(--arancio-500))",
          borderRadius: 0,
          padding: "var(--sp-5)",
          color: "var(--text-primary)",
          ...style
        }
      },
      children
    );
  }

  // components/brand/Marchio.jsx
  init_define_import_meta_env();
  var import_react4 = __toESM(require_react_shim(), 1);
  function Marchio({ forma = "esteso", colore = "crema", altezza = 48, style, ...rest }) {
    const testo = colore === "blu" ? "var(--blu-700)" : "var(--crema-100)";
    const breve = forma === "breve";
    return /* @__PURE__ */ import_react4.default.createElement(
      "div",
      {
        ...rest,
        style: { display: "inline-flex", alignItems: "stretch", gap: altezza * 0.28, color: testo, ...style }
      },
      /* @__PURE__ */ import_react4.default.createElement("div", { style: { width: Math.max(4, altezza * 0.16), background: "var(--accento, var(--arancio-500))", flex: "0 0 auto" } }),
      /* @__PURE__ */ import_react4.default.createElement("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center" } }, /* @__PURE__ */ import_react4.default.createElement(
        "div",
        {
          style: {
            font: `var(--weight-black) ${altezza}px/0.95 var(--font-display)`,
            letterSpacing: "var(--tracking-display)",
            textTransform: breve ? "uppercase" : "none"
          }
        },
        breve ? "Miniera Culturale" : "Miniera Culturale"
      ), !breve && /* @__PURE__ */ import_react4.default.createElement("div", { style: { font: `var(--weight-black) ${altezza * 0.5}px/1.1 var(--font-display)`, marginTop: altezza * 0.1 } }, "in Periferia"))
    );
  }

  // components/brand/FasciaFirma.jsx
  init_define_import_meta_env();
  var import_react5 = __toESM(require_react_shim(), 1);
  function FasciaFirma({ testo = "MINIERA CULTURALE", corpo = 34, style, ...rest }) {
    return /* @__PURE__ */ import_react5.default.createElement(
      "div",
      {
        ...rest,
        style: {
          background: "var(--accento, var(--arancio-500))",
          color: "var(--nero)",
          font: `var(--weight-black) ${corpo}px/1 var(--font-display)`,
          letterSpacing: "var(--tracking-banner)",
          textAlign: "center",
          padding: `${corpo * 0.24}px 0 ${corpo * 0.3}px`,
          width: "100%",
          ...style
        }
      },
      testo
    );
  }

  // components/brand/BadgePuntata.jsx
  init_define_import_meta_env();
  var import_react6 = __toESM(require_react_shim(), 1);
  function BadgePuntata({ children, corpo = 44, style, ...rest }) {
    return /* @__PURE__ */ import_react6.default.createElement(
      "div",
      {
        ...rest,
        style: {
          display: "inline-block",
          background: "var(--accento, var(--arancio-500))",
          color: "var(--nero)",
          font: `var(--weight-black) ${corpo}px/1 var(--font-display)`,
          padding: `${corpo * 0.36}px ${corpo * 0.5}px ${corpo * 0.45}px`,
          borderRadius: "var(--radius-badge)",
          ...style
        }
      },
      children
    );
  }

  // components/eventi/RigaOspite.jsx
  init_define_import_meta_env();
  var import_react7 = __toESM(require_react_shim(), 1);
  function RigaOspite({ nome, ruolo, corpo = 34, style, ...rest }) {
    return /* @__PURE__ */ import_react7.default.createElement("div", { ...rest, style: { display: "flex", flexDirection: "column", gap: 2, ...style } }, /* @__PURE__ */ import_react7.default.createElement(
      "div",
      {
        style: {
          font: `var(--weight-black) ${corpo}px/0.98 var(--font-display)`,
          letterSpacing: "var(--tracking-display)",
          color: "var(--text-primary)"
        }
      },
      nome
    ), ruolo && /* @__PURE__ */ import_react7.default.createElement("div", { style: { font: "var(--type-mono)", color: "var(--text-secondary)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase" } }, ruolo));
  }

  // components/eventi/SchedaEvento.jsx
  init_define_import_meta_env();
  var import_react8 = __toESM(require_react_shim(), 1);
  var nomiFormato = { incontro: "Incontro", proiezione: "Proiezione", presentazione: "Presentazione" };
  function SchedaEvento({
    formato = "incontro",
    ciclo,
    titolo,
    occhiello,
    data,
    luogo = "Palazzo ex Venchi Unica, Piazza Massaua 17/b, Torino",
    ospiti = [],
    style,
    ...rest
  }) {
    return /* @__PURE__ */ import_react8.default.createElement(
      "article",
      {
        ...rest,
        "data-ciclo": ciclo,
        style: {
          background: "var(--surface-raised)",
          borderTop: "6px solid var(--accento)",
          padding: "var(--sp-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-3)",
          color: "var(--text-primary)",
          ...style
        }
      },
      /* @__PURE__ */ import_react8.default.createElement(Etichetta, null, nomiFormato[formato] || formato),
      occhiello && /* @__PURE__ */ import_react8.default.createElement("div", { style: { font: "var(--type-small)", color: "var(--text-secondary)" } }, occhiello),
      /* @__PURE__ */ import_react8.default.createElement("h3", { style: { font: "var(--weight-black) var(--text-2xl)/0.98 var(--font-display)", letterSpacing: "var(--tracking-display)", margin: 0 } }, titolo),
      ospiti.length > 0 && /* @__PURE__ */ import_react8.default.createElement("div", { style: { font: "var(--type-body)", color: "var(--text-secondary)" } }, "con ", ospiti.join(", ")),
      /* @__PURE__ */ import_react8.default.createElement("div", { style: { font: "var(--type-mono)", color: "var(--text-primary)", marginTop: "var(--sp-2)" } }, data),
      /* @__PURE__ */ import_react8.default.createElement("div", { style: { font: "var(--type-mono)", color: "var(--text-muted)" } }, luogo)
    );
  }
  return __toCommonJS(index_exports);
})();
window.MinieraDS=MinieraDS.__dsMainNs?Object.assign({},MinieraDS,MinieraDS.__dsMainNs,{__dsMainNs:undefined}):MinieraDS;
