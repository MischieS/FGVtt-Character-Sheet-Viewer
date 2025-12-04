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

function normalizeBackgroundName(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^reference\.backgrounddata/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

const ABILITY_SHORT = {
  strength: "str",
  dexterity: "dex",
  constitution: "con",
  intelligence: "int",
  wisdom: "wis",
  charisma: "cha",
};

const SKILL_DISPLAY_ORDER = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
];

const SKILL_ORDER_MAP = SKILL_DISPLAY_ORDER.reduce((acc, name, index) => {
  acc[name.toLowerCase()] = index;
  return acc;
}, {});

const SKILL_DESCRIPTIONS = {
  "Acrobatics": "Your Dexterity (Acrobatics) check covers your attempt to stay on your feet in a tricky situation, such as when you're trying to run across a sheet of ice, balance on a tightrope, or stay upright on a rocking ship's deck. The DM might also call for a Dexterity (Acrobatics) check to see if you can perform acrobatic stunts, including dives, rolls, somersaults, and flips.",
  "Animal Handling": "When there is any question whether you can calm down a domesticated animal, keep a mount from getting spooked, or intuit an animal's intentions, the DM might call for a Wisdom (Animal Handling) check. You also make a Wisdom (Animal Handling) check to control your mount when you attempt a risky maneuver.",
  "Arcana": "Your Intelligence (Arcana) check measures your ability to recall lore about spells, magic items, eldritch symbols, magical traditions, the planes of existence, and the inhabitants of those planes.",
  "Athletics": "Your Strength (Athletics) check covers difficult situations you encounter while climbing, jumping, or swimming.",
  "Deception": "Your Charisma (Deception) check determines whether you can convincingly hide the truth, either verbally or through your actions. This deception can encompass everything from misleading others through ambiguity to telling outright lies. Typical situations include trying to fast-talk a guard, con a merchant, earn money through gambling, pass yourself off in a disguise, dull someone's suspicions with false assurances, or maintain a straight face while telling a blatant lie.",
  "History": "Your Intelligence (History) check measures your ability to recall lore about historical events, legendary people, ancient kingdoms, past disputes, recent wars, and lost civilizations.",
  "Insight": "Your Wisdom (Insight) check decides whether you can determine the true intentions of a creature, such as when searching out a lie or predicting someone's next move. Doing so involves gleaning clues from body language, speech habits, and changes in mannerisms.",
  "Intimidation": "When you attempt to influence someone through overt threats, hostile actions, and physical violence, the DM might ask you to make a Charisma (Intimidation) check. Examples include trying to pry information out of a prisoner, convincing street thugs to back down from a confrontation, or using the edge of a broken bottle to convince a sneering vizier to reconsider a decision.",
  "Investigation": "When you look around for clues and make deductions based on those clues, you make an Intelligence (Investigation) check. You might deduce the location of a hidden object, discern from the appearance of a wound what kind of weapon dealt it, or determine the weakest point in a tunnel that could cause it to collapse. Poring through ancient scrolls in search of a hidden fragment of knowledge might also call for an Intelligence (Investigation) check.",
  "Medicine": "A Wisdom (Medicine) check lets you try to stabilize a dying companion or diagnose an illness.",
  "Nature": "Your Intelligence (Nature) check measures your ability to recall lore about terrain, plants and animals, the weather, and natural cycles.",
  "Perception": "Your Wisdom (Perception) check lets you spot, hear, or otherwise detect the presence of something. It measures your general awareness of your surroundings and the keenness of your senses. For example, you might try to hear a conversation through a closed door, eavesdrop under an open window, or hear monsters moving stealthily in the forest. Or you might try to spot things that are obscured or easy to miss, whether they are orcs lying in ambush on a road, thugs hiding in the shadows of an alley, or candlelight under a closed secret door.",
  "Performance": "Your Charisma (Performance) check determines how well you can delight an audience with music, dance, acting, storytelling, or some other form of entertainment.",
  "Persuasion": "When you attempt to influence someone or a group of people with tact, social graces, or good nature, the DM might ask you to make a Charisma (Persuasion) check. Typically, you use persuasion when acting in good faith, to foster friendships, make cordial requests, or exhibit proper etiquette. Examples of persuading others include convincing a chamberlain to let your party see the king, negotiating peace between warring tribes, or inspiring a crowd of townsfolk.",
  "Religion": "Your Intelligence (Religion) check measures your ability to recall lore about deities, rites and prayers, religious hierarchies, holy symbols, and the practices of secret cults.",
  "Sleight of Hand": "Whenever you attempt an act of legerdemain or manual trickery, such as planting something on someone else or concealing an object on your person, make a Dexterity (Sleight of Hand) check. The DM might also call for a Dexterity (Sleight of Hand) check to determine whether you can lift a coin purse off another person or slip something out of another person's pocket.",
  "Stealth": "Make a Dexterity (Stealth) check when you attempt to conceal yourself from enemies, slink past guards, slip away without being noticed, or sneak up on someone without being seen or heard.",
  "Survival": "The DM might ask you to make a Wisdom (Survival) check to follow tracks, hunt wild game, guide your group through frozen wastelands, identify signs that owlbears live nearby, predict the weather, or avoid quicksand and other natural hazards.",
};

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
  detail.innerHTML = `<td colspan="${colSpan}" class="detail-cell"><div class="detail-card">${html}</div></td>`;
  row.parentElement.insertBefore(detail, row.nextSibling);
  row.classList.add("expanded");
}

function getSkillDescription(name) {
  if (!name) return "Checks with this skill use one of your abilities and may be modified by proficiency and circumstances.";
  return SKILL_DESCRIPTIONS[name] || "Checks with this skill use one of your abilities and may be modified by proficiency and circumstances.";
}

function readableAbilityName(statKey) {
  const key = (statKey || "").toLowerCase();
  const map = {
    strength: "Strength",
    dexterity: "Dexterity",
    constitution: "Constitution",
    intelligence: "Intelligence",
    wisdom: "Wisdom",
    charisma: "Charisma",
  };
  return map[key] || statKey || "";
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
  const charNameNode = char.querySelector(":scope > name");
  $("#char-name").textContent = charNameNode ? charNameNode.textContent : "";

  const classNode = char.querySelector("classes > *");
  $("#char-class").textContent = classNode ? textOf(classNode, "name") : "";
  $("#char-level").textContent = classNode ? numberOf(classNode, "level") : numberOf(char, "level");

  $("#char-race").textContent = textOf(char, "racename") || textOf(char, "race");
  const rawBackground = textOf(char, "backgroundlink > recordname");
  $("#char-background").textContent = normalizeBackgroundName(rawBackground);

  const hpNode = char.querySelector("hp");
  const hpWounds = hpNode ? numberOf(hpNode, "wounds", NaN) : NaN;
  const hpTotal = hpNode ? numberOf(hpNode, "total", NaN) : NaN;
  const hpTemp = hpNode ? numberOf(hpNode, "temporary", NaN) : NaN;
  const currentHp = Number.isFinite(hpTotal) && Number.isFinite(hpWounds) ? hpTotal - hpWounds : hpTotal;

  const setHpField = (selector, value) => {
    const el = $(selector);
    if (el) {
      el.textContent = Number.isFinite(value) ? value : "";
    }
  };

  $("#char-hp").textContent = Number.isFinite(currentHp) ? currentHp : "";
  setHpField("#hp-max", hpTotal);
  setHpField("#hp-wounds", hpWounds);
  setHpField("#hp-temp", hpTemp);

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
      const saveEl = $("#save-" + (ABILITY_SHORT[abilityKey] || abilityKey));
      if (dataNode) {
        const score = numberOf(dataNode, "score");
        const bonus = numberOf(dataNode, "bonus");
        scoreEl.textContent = score || "";
        modEl.textContent = bonus >= 0 ? `+${bonus}` : String(bonus);
        if (saveEl) {
          const saveValue = numberOf(dataNode, "save", NaN);
          saveEl.textContent = formatSigned(saveValue);
        }
      } else {
        scoreEl.textContent = "";
        modEl.textContent = "";
        if (saveEl) {
          saveEl.textContent = "";
        }
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
      const locRaw = numberOf(item, "carried", 0);
      const loc = locRaw === 2 ? "Equipped" : locRaw === 1 ? "Carried" : "Stored";
      const weightEach = numberOf(item, "weight", 0);
      const weightTotal = (count || 1) * weightEach;
      const row = document.createElement("li");
      row.className = "inventory-row";
      row.innerHTML = `
        <div class="inventory-name">
          <span class="inventory-count">${count || 1}</span>
          <span class="inventory-label">${name}</span>
        </div>
        <div class="inventory-type">${type || ""}</div>
        <div class="inventory-loc">${loc}</div>
        <div class="inventory-weight">${weightTotal || 0}</div>
        <div class="inventory-detail"></div>
      `;
      const detailEl = row.querySelector(".inventory-detail");
      row.addEventListener("click", () => {
        if (!detailEl) return;
        if (row.classList.contains("expanded")) {
          row.classList.remove("expanded");
          detailEl.innerHTML = "";
          return;
        }
        const parts = [];
        if (type) parts.push(type);
        const subtype = textOf(item, "subtype");
        if (subtype) parts.push(subtype);
        const cost = textOf(item, "cost");
        if (cost) parts.push(`Cost ${cost}`);
        const weightStr = weightEach ? `${weightEach} ea` : "";
        if (weightStr) parts.push(`Weight ${weightStr}`);
        const headerLine = parts.join(" | ");
        const desc = getItemDescription(name, item);
        detailEl.innerHTML = `
          <div class="detail-title">${name}</div>
          <div class="detail-header">${headerLine}</div>
          <div class="detail-body">${desc}</div>
        `;
        row.classList.add("expanded");
      });
      invBody.appendChild(row);
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
    const skills = groupChildren(skillList).map((skill) => ({
      node: skill,
      name: textOf(skill, "name"),
    }));

    skills.sort((a, b) => {
      const indexA = SKILL_ORDER_MAP[a.name?.toLowerCase()] ?? Number.POSITIVE_INFINITY;
      const indexB = SKILL_ORDER_MAP[b.name?.toLowerCase()] ?? Number.POSITIVE_INFINITY;
      if (indexA !== indexB) return indexA - indexB;
      return (a.name || "").localeCompare(b.name || "");
    });

    skills.forEach(({ node: skill, name }) => {
      const statKey = textOf(skill, "stat");
      const misc = numberOf(skill, "misc");
      const total = numberOf(skill, "total");
      const prof = numberOf(skill, "prof");
      const li = document.createElement("li");
      li.className = "skill-row";
      li.innerHTML = `
        <div class="skill-name">
          <span class="skill-label">${name}</span>
        </div>
        <div class="skill-stat">${statKey}</div>
        <div class="skill-misc">${formatSigned(misc)}</div>
        <div class="skill-total">${formatSigned(total)}</div>
        <div class="skill-detail"></div>
      `;
      const detailEl = li.querySelector(".skill-detail");
      li.addEventListener("click", () => {
        if (!detailEl) return;
        if (li.classList.contains("expanded")) {
          li.classList.remove("expanded");
          detailEl.innerHTML = "";
          return;
        }
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
        detailEl.innerHTML = `
          <div class="detail-title">${name}</div>
          <div class="detail-header">${headerLine}</div>
          <div class="detail-body">${desc}</div>
        `;
        li.classList.add("expanded");
      });
      skillsBody.appendChild(li);
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
    const name = textOf(item, "name");
    const textNode = item.querySelector("text");
    let detail = "";
    if (textNode) {
      detail = textNode.textContent.replace(/\s+/g, " ").trim();
    }
    const note = abilityNoteForItem(item);
    const row = buildAbilityRow(name, note, detail);
    container.appendChild(row);
  });
}

function renderSimpleList(char, listName, selector) {
  const container = $(selector);
  container.innerHTML = "";
  const listNode = char.querySelector(listName);
  if (!listNode) return;

  groupChildren(listNode).forEach((item) => {
    const name = textOf(item, "name");
    const note = abilityNoteForItem(item);
    const row = buildAbilityRow(name, note, "");
    container.appendChild(row);
  });
}

function abilityNoteForItem(item) {
  return textOf(item, "source") || textOf(item, "type") || textOf(item, "shortdescription") || "";
}

function buildAbilityRow(name, noteText, detailText) {
  const li = document.createElement("li");
  li.className = "ability-row";

  const nameDiv = document.createElement("div");
  nameDiv.className = "ability-name";
  nameDiv.textContent = name || "Unnamed";
  li.appendChild(nameDiv);

  const noteDiv = document.createElement("div");
  noteDiv.className = "ability-note";
  noteDiv.textContent = noteText || "—";
  li.appendChild(noteDiv);

  if (detailText) {
    const detailDiv = document.createElement("div");
    detailDiv.className = "ability-detail";
    detailDiv.textContent = detailText;
    li.appendChild(detailDiv);
    li.addEventListener("click", () => {
      li.classList.toggle("expanded");
    });
  } else {
    li.classList.add("ability-row-static");
  }

  return li;
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
      // Actions / class features / feats displayed in powers list
      list.forEach((p) => {
        const name = textOf(p, "name");
        const level = numberOf(p, "level");
        const descNode = p.querySelector("description");
        const desc = descNode ? descNode.textContent.replace(/\s+/g, " ").trim() : "";
        const row = document.createElement("li");
        row.className = "power-row";
        const noteBits = [];
        const type = textOf(p, "type");
        if (groupName) noteBits.push(groupName);
        if (type) noteBits.push(type);
        const recharge = textOf(p, "recharge");
        if (recharge) noteBits.push(recharge);
        row.innerHTML = `
          <div class="power-name">${name}</div>
          <div class="power-level">${level || "—"}</div>
          <div class="power-note">${noteBits.join(" | ") || "—"}</div>
          <div class="power-detail"></div>
        `;
        if (desc) {
          const detail = row.querySelector(".power-detail");
          row.addEventListener("click", () => {
            if (!detail) return;
            if (row.classList.contains("expanded")) {
              row.classList.remove("expanded");
              detail.textContent = "";
              return;
            }
            detail.innerHTML = `
              <div class="detail-title">${name}</div>
              <div class="detail-body">${desc}</div>
            `;
            row.classList.add("expanded");
          });
        } else {
          row.classList.add("power-row-static");
        }
        actionsContainer.appendChild(row);
      });
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
