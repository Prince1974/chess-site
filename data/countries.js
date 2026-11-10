/* ============================================================
   Masterchessis — data/countries.js
   Pays et régions du club, avec drapeaux emoji et continents.
   ============================================================ */
(function () {
  'use strict';

  const RAW = [
    ['DZ','Algérie','Afrique'],['AO','Angola','Afrique'],['BJ','Bénin','Afrique'],['BW','Botswana','Afrique'],
    ['BF','Burkina Faso','Afrique'],['BI','Burundi','Afrique'],['CM','Cameroun','Afrique'],['CV','Cap-Vert','Afrique'],
    ['CF','République centrafricaine','Afrique'],['TD','Tchad','Afrique'],['KM','Comores','Afrique'],['CG','Congo-Brazzaville','Afrique'],
    ['CD','RD Congo','Afrique'],['CI','Côte d’Ivoire','Afrique'],['DJ','Djibouti','Afrique'],['EG','Égypte','Afrique'],
    ['GQ','Guinée équatoriale','Afrique'],['ER','Érythrée','Afrique'],['SZ','Eswatini','Afrique'],['ET','Éthiopie','Afrique'],
    ['GA','Gabon','Afrique'],['GM','Gambie','Afrique'],['GH','Ghana','Afrique'],['GN','Guinée','Afrique'],
    ['GW','Guinée-Bissau','Afrique'],['KE','Kenya','Afrique'],['LS','Lesotho','Afrique'],['LR','Libéria','Afrique'],
    ['LY','Libye','Afrique'],['MG','Madagascar','Afrique'],['MW','Malawi','Afrique'],['ML','Mali','Afrique'],
    ['MR','Mauritanie','Afrique'],['MU','Maurice','Afrique'],['MA','Maroc','Afrique'],['MZ','Mozambique','Afrique'],
    ['NA','Namibie','Afrique'],['NE','Niger','Afrique'],['NG','Nigéria','Afrique'],['RW','Rwanda','Afrique'],
    ['ST','Sao Tomé-et-Principe','Afrique'],['SN','Sénégal','Afrique'],['SC','Seychelles','Afrique'],['SL','Sierra Leone','Afrique'],
    ['SO','Somalie','Afrique'],['ZA','Afrique du Sud','Afrique'],['SS','Soudan du Sud','Afrique'],['SD','Soudan','Afrique'],
    ['TZ','Tanzanie','Afrique'],['TG','Togo','Afrique'],['TN','Tunisie','Afrique'],['UG','Ouganda','Afrique'],
    ['ZM','Zambie','Afrique'],['ZW','Zimbabwe','Afrique'],
    ['AL','Albanie','Europe'],['DE','Allemagne','Europe'],['AD','Andorre','Europe'],['AT','Autriche','Europe'],
    ['BE','Belgique','Europe'],['BY','Bélarus','Europe'],['BA','Bosnie-Herzégovine','Europe'],['BG','Bulgarie','Europe'],
    ['HR','Croatie','Europe'],['DK','Danemark','Europe'],['ES','Espagne','Europe'],['EE','Estonie','Europe'],
    ['FI','Finlande','Europe'],['FR','France','Europe'],['GR','Grèce','Europe'],['HU','Hongrie','Europe'],
    ['IE','Irlande','Europe'],['IS','Islande','Europe'],['IT','Italie','Europe'],['XK','Kosovo','Europe'],
    ['LV','Lettonie','Europe'],['LI','Liechtenstein','Europe'],['LT','Lituanie','Europe'],['LU','Luxembourg','Europe'],
    ['MK','Macédoine du Nord','Europe'],['MT','Malte','Europe'],['MD','Moldavie','Europe'],['MC','Monaco','Europe'],
    ['ME','Monténégro','Europe'],['NO','Norvège','Europe'],['NL','Pays-Bas','Europe'],['PL','Pologne','Europe'],
    ['PT','Portugal','Europe'],['CZ','Tchéquie','Europe'],['RO','Roumanie','Europe'],['GB','Royaume-Uni','Europe'],
    ['RU','Russie','Europe'],['SM','Saint-Marin','Europe'],['RS','Serbie','Europe'],['SK','Slovaquie','Europe'],
    ['SI','Slovénie','Europe'],['SE','Suède','Europe'],['CH','Suisse','Europe'],['UA','Ukraine','Europe'],
    ['VA','Vatican','Europe'],
    ['AR','Argentine','Amériques'],['BO','Bolivie','Amériques'],['BR','Brésil','Amériques'],['CA','Canada','Amériques'],
    ['CL','Chili','Amériques'],['CO','Colombie','Amériques'],['CR','Costa Rica','Amériques'],['CU','Cuba','Amériques'],
    ['DO','République dominicaine','Amériques'],['EC','Équateur','Amériques'],['SV','Salvador','Amériques'],
    ['GT','Guatemala','Amériques'],['HT','Haïti','Amériques'],['HN','Honduras','Amériques'],['JM','Jamaïque','Amériques'],
    ['MX','Mexique','Amériques'],['NI','Nicaragua','Amériques'],['PA','Panama','Amériques'],['PY','Paraguay','Amériques'],
    ['PE','Pérou','Amériques'],['PR','Porto Rico','Amériques'],['US','États-Unis','Amériques'],['UY','Uruguay','Amériques'],
    ['VE','Venezuela','Amériques'],
    ['SA','Arabie saoudite','Asie'],['AM','Arménie','Asie'],['AZ','Azerbaïdjan','Asie'],['BH','Bahreïn','Asie'],
    ['BD','Bangladesh','Asie'],['BT','Bhoutan','Asie'],['BN','Brunei','Asie'],['KH','Cambodge','Asie'],
    ['CN','Chine','Asie'],['CY','Chypre','Asie'],['KP','Corée du Nord','Asie'],['KR','Corée du Sud','Asie'],
    ['AE','Émirats arabes unis','Asie'],['GE','Géorgie','Asie'],['IN','Inde','Asie'],['ID','Indonésie','Asie'],
    ['IQ','Irak','Asie'],['IR','Iran','Asie'],['IL','Israël','Asie'],['JP','Japon','Asie'],
    ['JO','Jordanie','Asie'],['KZ','Kazakhstan','Asie'],['KW','Koweït','Asie'],['KG','Kirghizistan','Asie'],
    ['LA','Laos','Asie'],['LB','Liban','Asie'],['MY','Malaisie','Asie'],['MV','Maldives','Asie'],
    ['MN','Mongolie','Asie'],['MM','Myanmar','Asie'],['NP','Népal','Asie'],['OM','Oman','Asie'],
    ['PK','Pakistan','Asie'],['PH','Philippines','Asie'],['QA','Qatar','Asie'],['SG','Singapour','Asie'],
    ['LK','Sri Lanka','Asie'],['SY','Syrie','Asie'],['TW','Taïwan','Asie'],['TJ','Tadjikistan','Asie'],
    ['TH','Thaïlande','Asie'],['TL','Timor oriental','Asie'],['TR','Turquie','Asie'],['TM','Turkménistan','Asie'],
    ['UZ','Ouzbékistan','Asie'],['VN','Viêt Nam','Asie'],['YE','Yémen','Asie'],
    ['AU','Australie','Océanie'],['FJ','Fidji','Océanie'],['NZ','Nouvelle-Zélande','Océanie'],['PG','Papouasie-Nouvelle-Guinée','Océanie'],
    ['WS','Samoa','Océanie'],['TO','Tonga','Océanie'],['VU','Vanuatu','Océanie']
  ];

  const flag = (code) => String(code || '').toUpperCase().replace(/[A-Z]/g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
  const list = RAW.map(([code, name, continent]) => ({ code, name, continent, flag: flag(code) }));
  const byCode = {};
  list.forEach(c => { byCode[c.code] = c; });

  window.Countries = {
    list,
    byCode,
    flag,
    name: (code) => (byCode[String(code || '').toUpperCase()] || {}).name || '',
    continent: (code) => (byCode[String(code || '').toUpperCase()] || {}).continent || '',
    options(selected, includeEmpty) {
      const groups = {};
      list.forEach(c => { (groups[c.continent] = groups[c.continent] || []).push(c); });
      let html = includeEmpty ? '<option value="">— Choisir un pays —</option>' : '';
      Object.keys(groups).sort().forEach(cont => {
        html += `<optgroup label="${cont}">`;
        groups[cont].sort((a, b) => a.name.localeCompare(b.name, 'fr')).forEach(c => {
          html += `<option value="${c.code}" ${c.code === String(selected || '').toUpperCase() ? 'selected' : ''}>${c.flag} ${c.name}</option>`;
        });
        html += '</optgroup>';
      });
      return html;
    }
  };
})();
