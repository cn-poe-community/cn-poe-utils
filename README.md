# cn-poe-utils

国服POE工具箱，目前提供：

- API 类型
- JSON,TEXT 翻译
- Building 生成

## 安装

```
npm install cn-poe-utils
```

## 使用

翻译JSON数据，并生成Building:
```ts
import type {GetItemsResult,GetPassiveSkillsResult} from "cn-poe-utils/api";
import {TranslatorFactory} from "cn-poe-utils/translator/zh2en";
import {transform} from "cn-poe-utils/building";

const items: GetItemsResult = await getItems();// 从API获取的items 数据
const passiveSkills: GetPassiveSkillsResult = await getPassiveSkills();// 从API获取的passiveSkills 数据

const factory = new TranslatorFactory();
const jsonTranslator = factory.getJsonTranslator();
jsonTranslator.transItems(items);
jsonTranslator.transPassiveSkills(passiveSkills);
const building = transform(r.items, r.passiveSkills);
console.log(building);
```

翻译文本数据：

```ts
const text = `物品类别: 腰带
稀 有 度: 稀有
劲风 束灵
忆境 饰布腰带
--------
品质（属性词缀）: +20% (augmented)
--------
需求:
等级: 66
--------
物品等级: 100
--------
击中被你恐惧的敌人时，该次击中的法术暴击率提高 50% (enchant)
--------
力量提高 18% (implicit)
--------
+99 最大生命
+68 最大魔力
药剂充能使用降低 20%
药剂效果的持续时间延长 33%
冷却回复速度加快 16%
伤害提高 17% (crafted)
--------
忆境物品`;

const factory = new TranslatorFactory();
const textTranslator = factory.getTextTranslator();
console.log(textTranslator.trans(text));
```

# credits

[poe-dat-viewer](https://github.com/SnosMe/poe-dat-viewer)<br/>
[dat-schema](https://github.com/poe-tool-dev/dat-schema)
