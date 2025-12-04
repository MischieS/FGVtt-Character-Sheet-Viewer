// Simple Fantasy Grounds character viewer for exported XML

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function textOf(node, selector, fallback = "") {
  const el = selector ? node.querySelector(selector) : node;
  return el && el.textContent != null ? el.textContent : fallback;
}

function numberOf(node, selector, fallback = 0) {
  const t = textOf(node, selector, "").trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : fallback;
}

function formatSigned(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "+0";
  return n > 0 ? `+${n}` : String(n);
}

function groupChildren(node) {
  const result = [];
  node && node.childNodes.forEach((child) => {
    if (child.nodeType === 1) {
      result.push(child);
    }
  });
  return result;
}

function toggleDetailRow(row, colSpan, html) {
  const next = row.nextElementSibling;
  if (next && next.classList.contains("detail-row")) {
    next.remove();
    row.classList.remove("expanded");
    return;
  }
  const detail = document.createElement("tr");
  detail.className = "detail-row";
  detail.innerHTML = `<td colspan="${colSpan}" class="detail-cell">${html}</td>`;
  row.parentElement.insertBefore(detail, row.nextSibling);
  row.classList.add("expanded");
}

function getSkillDescription(name) {
  const skills = (window.Descriptions && window.Descriptions.skills) || {};
  return skills[name] || "Checks with this skill use one of your abilities and may be modified by proficiency and circumstances.";
}

function readableAbilityName(statKey) {
  const key = (statKey || "").toLowerCase();
  if (key === "strength" || key === "str") return "Strength";
  if (key === "dexterity" || key === "dex") return "Dexterity";
  if (key === "constitution" || key === "con") return "Constitution";
  if (key === "intelligence" || key === "int") return "Intelligence";
  if (key === "wisdom" || key === "wis") return "Wisdom";
  if (key === "charisma" || key === "cha") return "Charisma";
  return statKey || "";
}

function getSpellDescription(name, powerNode) {
  const spells = (window.Descriptions && window.Descriptions.spells) || {};
  if (spells[name]) return spells[name];
  if (powerNode) {
    const descNode = powerNode.querySelector("description");
    if (descNode) return descNode.textContent.replace(/\s+/g, " ").trim();
  }
  return "No additional description for this spell in this export.";
}

function getItemDescription(name, itemNode) {
  const items = (window.Descriptions && window.Descriptions.items) || {};
  if (items[name]) return items[name];
  if (itemNode) {
    const descNode = itemNode.querySelector("description");
    if (descNode) return descNode.textContent.replace(/\s+/g, " ").trim();
  }
  return "No additional description for this item in this export.";
}

function handleFileSelect(evt) {
  const file = evt.target.files && evt.target.files[0];
  if (!file) return;

  const status = $("#file-status");
  status.textContent = `Loading ${file.name} ...`;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const xmlText = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const char = xmlDoc.querySelector("root > character");
      if (!char) {
        status.textContent = "No <character> element found.";
        return;
      }
      renderCharacter(char);
      status.textContent = `Loaded ${file.name}`;
    } catch (err) {
      console.error(err);
      status.textContent = "Failed to parse XML";
    }
  };
  reader.onerror = () => {
    $("#file-status").textContent = "Error reading file";
  };
  reader.readAsText(file);
}

function renderCharacter(char) {
  // Header
  $("#char-name").textContent = textOf(char, "name");

  const classNode = char.querySelector("classes > *");
  $("#char-class").textContent = classNode ? textOf(classNode, "name") : "";
  $("#char-level").textContent = classNode ? numberOf(classNode, "level") : numberOf(char, "level");

  $("#char-race").textContent = textOf(char, "racename") || textOf(char, "race");
  $("#char-background").textContent = textOf(char, "backgroundlink > recordname");

  const hpNode = char.querySelector("hp");
  $("#char-hp").textContent = hpNode ? numberOf(hpNode, "total") : "";

  const acNode = char.querySelector("defenses > ac");
  $("#char-ac").textContent = acNode ? numberOf(acNode, "total") : "";

  const initNode = char.querySelector("initiative");
  $("#char-init").textContent = initNode ? numberOf(initNode, "total") : "";

  const speedNode = char.querySelector("speed");
  $("#char-speed").textContent = speedNode ? numberOf(speedNode, "total") : "";

  $("#char-perception").textContent = numberOf(char, "perception");
  $("#char-prof").textContent = numberOf(char, "profbonus");

  const classHd = classNode ? textOf(classNode, "hddie") : "";
  const classHdUsed = classNode ? numberOf(classNode, "hdused") : 0;
  $("#char-hd").textContent = classHd ? `${classHd} (${classHdUsed} used)` : "";

  // Abilities
  const abilitiesNode = char.querySelector("abilities");
  if (abilitiesNode) {
    $all(".ability").forEach((el) => {
      const abilityKey = el.getAttribute("data-ability");
      const dataNode = abilitiesNode.querySelector(abilityKey);
      const scoreEl = el.querySelector(".ability-score");
      const modEl = el.querySelector(".ability-mod");
      if (dataNode) {
        const score = numberOf(dataNode, "score");
        const bonus = numberOf(dataNode, "bonus");
        scoreEl.textContent = score || "";
        modEl.textContent = bonus >= 0 ? `+${bonus}` : String(bonus);
      } else {
        scoreEl.textContent = "";
        modEl.textContent = "";
      }
    });
  }

  // Weapons (weaponlist)
  const weaponsBody = $("#weapons-body");
  weaponsBody.innerHTML = "";
  const weaponList = char.querySelector("weaponlist");
  if (weaponList) {
    groupChildren(weaponList).forEach((item) => {
      const tr = document.createElement("tr");
      const name = textOf(item, "name");
      const atk = numberOf(item, "attackbonus", 0) + numberOf(char, "profbonus", 0);
      const dmgNode = item.querySelector("damagelist > *");
      const dmgDice = dmgNode ? textOf(dmgNode, "dice") : "";
      const dmgType = dmgNode ? textOf(dmgNode, "type") : "";
      const props = textOf(item, "properties");

      tr.innerHTML = `
        <td>${name}</td>
        <td>${atk >= 0 ? "+" + atk : atk}</td>
        <td>${dmgDice ? `${dmgDice} ${dmgType}` : ""}</td>
        <td>${props}</td>
      `;
      weaponsBody.appendChild(tr);
    });
  }

  // Inventory (inventorylist)
  const invBody = $("#inventory-body");
  invBody.innerHTML = "";
  const invList = char.querySelector("inventorylist");
  if (invList) {
    groupChildren(invList).forEach((item) => {
      const count = numberOf(item, "count", 1);
      const name = textOf(item, "name");
      const type = textOf(item, "type");
      const loc = numberOf(item, "carried", 0) === 2 ? "Equipped" : numberOf(item, "carried", 0) === 1 ? "Carried" : "Stored";
      const weight = numberOf(item, "weight", 0) * (count || 1);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${count || 1}</td>
        <td><span class="cell-label">${name}</span></td>
        <td>${type}</td>
        <td>${loc}</td>
        <td>${weight}</td>
      `;
      tr.addEventListener("click", () => {
        const cost = textOf(item, "cost");
        const subtype = textOf(item, "subtype");
        const headerBits = [];
        if (type) headerBits.push(type);
        if (subtype) headerBits.push(subtype);
        if (cost) headerBits.push(`Cost ${cost}`);
        headerBits.push(`Weight ${weight}`);
        const headerLine = headerBits.join(" | ");
        const desc = getItemDescription(name, item);
        const html = `
          <div class="detail-title">${name}</div>
          <div class="detail-header">${headerLine}</div>
          <div class="detail-body">${desc}</div>
        `;
        toggleDetailRow(tr, 5, html);
      });
      invBody.appendChild(tr);
    });
  }

  // Coins
  const coinsRow = $("#coins-row");
  coinsRow.innerHTML = "";
  const coins = char.querySelector("coins");
  if (coins) {
    groupChildren(coins).forEach((coin) => {
      const name = textOf(coin, "name");
      const amount = numberOf(coin, "amount", 0);
      const span = document.createElement("div");
      span.className = "coin";
      span.innerHTML = `<span>${name}</span><div class="field tiny">${amount}</div>`;
      coinsRow.appendChild(span);
    });
  }

  // Encumbrance
  const enc = char.querySelector("encumbrance");
  if (enc) {
    $("#enc-max").textContent = numberOf(enc, "max");
    $("#enc-load").textContent = numberOf(enc, "load");
    $("#enc-lpd").textContent = numberOf(enc, "liftpushdrag");
  } else {
    $("#enc-max").textContent = "";
    $("#enc-load").textContent = "";
    $("#enc-lpd").textContent = "";
  }

  // Skills
  const skillsBody = $("#skills-body");
  skillsBody.innerHTML = "";
  const skillList = char.querySelector("skilllist");
  const abilitiesForSkills = char.querySelector("abilities");
  const abilityMods = {};
  if (abilitiesForSkills) {
    ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].forEach((ab) => {
      const n = abilitiesForSkills.querySelector(ab);
      abilityMods[ab] = n ? numberOf(n, "bonus", 0) : 0;
    });
  }
  const profBonus = numberOf(char, "profbonus", 0);
  if (skillList) {
    groupChildren(skillList).forEach((skill) => {
      const name = textOf(skill, "name");
      const statKey = textOf(skill, "stat");
      const misc = numberOf(skill, "misc");
      const total = numberOf(skill, "total");
      const prof = numberOf(skill, "prof");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="cell-label">${name}</span></td>
        <td>${statKey}</td>
        <td>${misc}</td>
        <td>${total}</td>
      `;
      const label = tr.querySelector(".cell-label");
      if (label) {
        label.style.cursor = "pointer";
        label.addEventListener("click", (evt) => {
          evt.stopPropagation();
          const abilityName = readableAbilityName(statKey);
          const abilityKey = (statKey || "").toLowerCase();
          const abilityMod = abilityMods[abilityKey];
          const parts = [];
          parts.push(`Total ${formatSigned(total)}`);
          if (abilityName) {
            if (Number.isFinite(abilityMod)) {
              parts.push(`Ability ${abilityName} ${formatSigned(abilityMod)}`);
            } else {
              parts.push(`Ability ${abilityName}`);
            }
          }
          if (prof) {
            const profTotal = profBonus * prof;
            parts.push(`Proficiency ${formatSigned(profTotal)}`);
          }
          if (misc) {
            parts.push(`Misc ${formatSigned(misc)}`);
          }
          const headerLine = parts.join(" | ");
          const desc = getSkillDescription(name);
          const html = `
            <div class="detail-title">${name}</div>
            <div class="detail-header">${headerLine}</div>
            <div class="detail-body">${desc}</div>
          `;
          toggleDetailRow(tr, 4, html);
        });
      }
      skillsBody.appendChild(tr);
    });
  }

  // Feats, features, traits, proficiencies, languages
  renderTextList(char, "featlist", "#feats-list");
  renderTextList(char, "featurelist", "#features-list");
  renderTextList(char, "traitlist", "#traits-list");
  renderSimpleList(char, "proficiencylist", "#profs-list");
  renderSimpleList(char, "languagelist", "#languages-list");

  // Powers / actions
  renderPowers(char);

  // Notes: this particular export does not seem to carry personality/notes blocks
  const notes = $("#notes-content");
  if (notes) {
    notes.textContent = "This export does not contain narrative notes (personality, bonds, etc.).";
    notes.classList.add("empty");
  }
}

function renderTextList(char, listName, selector) {
  const container = $(selector);
  container.innerHTML = "";
  const listNode = char.querySelector(listName);
  if (!listNode) return;

  groupChildren(listNode).forEach((item) => {
    const li = document.createElement("li");
    const name = textOf(item, "name");
    const textNode = item.querySelector("text");
    let plain = "";
    if (textNode) {
      plain = textNode.textContent.replace(/\s+/g, " ").trim();
    }
    const nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.textContent = name;
    li.appendChild(nameSpan);

    if (plain) {
      const span = document.createElement("span");
      span.className = "item-text";
      span.textContent = plain;
      span.style.display = "none";

      nameSpan.addEventListener("click", () => {
        const isHidden = span.style.display === "none";
        span.style.display = isHidden ? "block" : "none";
      });

      li.appendChild(span);
    }
    container.appendChild(li);
  });
}

function renderSimpleList(char, listName, selector) {
  const container = $(selector);
  container.innerHTML = "";
  const listNode = char.querySelector(listName);
  if (!listNode) return;

  groupChildren(listNode).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = textOf(item, "name");
    container.appendChild(li);
  });
}

function groupPowersByNamePrefix(powersNode) {
  const groups = {};
  groupChildren(powersNode).forEach((p) => {
    const groupName = textOf(p, "group") || "Other";
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(p);
  });
  return groups;
}

function renderPowers(char) {
  const powersNode = char.querySelector("powers");
  const actionsContainer = $("#actions-body");
  const spellsMain = $("#spells-main");
  actionsContainer.innerHTML = "";
  spellsMain.innerHTML = "";
  if (!powersNode) return;

  const groups = groupPowersByNamePrefix(powersNode);

  Object.keys(groups).forEach((groupName) => {
    const list = groups[groupName];

    if (groupName.startsWith("Spells")) {
      // Spells tab style grouping by level
      const byLevel = {};
      list.forEach((p) => {
        const level = numberOf(p, "level", 0);
        if (!byLevel[level]) byLevel[level] = [];
        byLevel[level].push(p);
      });

      Object.keys(byLevel).sort((a, b) => a - b).forEach((levelKey) => {
        const lvl = Number(levelKey);
        const groupDiv = document.createElement("div");
        groupDiv.className = "panel spell-group";
        const header = document.createElement("div");
        header.className = "panel-header";
        header.textContent = lvl === 0 ? `${groupName} (Cantrips)` : `${groupName} (Level ${lvl})`;
        groupDiv.appendChild(header);

        const body = document.createElement("div");
        body.className = "panel-body";
        const table = document.createElement("table");
        table.className = "table";
        table.innerHTML = `
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>School</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");
        byLevel[levelKey].forEach((p) => {
          const tr = document.createElement("tr");
          const name = textOf(p, "name");
          const levelVal = numberOf(p, "level");
          const school = textOf(p, "school");
          const range = textOf(p, "range");
          tr.innerHTML = `
            <td><span class="cell-label">${name}</span></td>
            <td>${levelVal}</td>
            <td>${school}</td>
            <td>${range}</td>
          `;
          tr.addEventListener("click", () => {
            const bits = [];
            bits.push(`Level ${levelVal}`);
            if (school) bits.push(school);
            const castingTime = textOf(p, "castingtime");
            const duration = textOf(p, "duration");
            const components = textOf(p, "components");
            if (castingTime) bits.push(`Cast: ${castingTime}`);
            if (duration) bits.push(`Duration: ${duration}`);
            if (range) bits.push(`Range: ${range}`);
            if (components) bits.push(`Components: ${components}`);
            const headerLine = bits.join(" | ");
            const desc = getSpellDescription(name, p);
            const html = `
              <div class="detail-title">${name}</div>
              <div class="detail-header">${headerLine}</div>
              <div class="detail-body">${desc}</div>
            `;
            toggleDetailRow(tr, 4, html);
          });
          tbody.appendChild(tr);
        });
        body.appendChild(table);
        groupDiv.appendChild(body);
        spellsMain.appendChild(groupDiv);
      });
    } else {
      // Actions / class features / feats
      const groupDiv = document.createElement("div");
      groupDiv.className = "action-group";
      const title = document.createElement("div");
      title.className = "action-group-title";
      title.textContent = groupName;
      groupDiv.appendChild(title);

      list.forEach((p) => {
        const name = textOf(p, "name");
        const level = numberOf(p, "level", 0);
        const descNode = p.querySelector("description");
        const desc = descNode ? descNode.textContent.replace(/\s+/g, " ").trim() : "";
        const row = document.createElement("div");
        row.className = "action-item";
        const titleLine = document.createElement("div");
        titleLine.className = "action-item-name";
        const labelSpan = document.createElement("span");
        labelSpan.textContent = level ? `${name} (Lv ${level})` : name;
        titleLine.appendChild(labelSpan);

        row.appendChild(titleLine);

        if (desc) {
          const meta = document.createElement("div");
          meta.className = "action-item-meta";
          meta.textContent = desc;
          meta.style.display = "none";

          titleLine.addEventListener("click", () => {
            const isHidden = meta.style.display === "none";
            meta.style.display = isHidden ? "block" : "none";
          });

          row.appendChild(meta);
        }
        groupDiv.appendChild(row);
      });

      actionsContainer.appendChild(groupDiv);
    }
  });
}

function setupTabs() {
  const buttons = $all(".tab-button");
  const tabs = $all(".tab-content");
  const sheet = $(".fg-sheet");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.id === `tab-${tabName}`);
      });
      if (sheet) {
        sheet.scrollTop = 0;
      }
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  const input = document.getElementById("xmlInput");
  if (input) {
    input.addEventListener("change", handleFileSelect);
  }
});
