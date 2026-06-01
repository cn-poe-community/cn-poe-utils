package provider

import (
	"github.com/cn-poe-community/cn-poe-utils/go/data/poe"
)

// PassiveSkillProvider 被动技能提供者
type PassiveSkillProvider struct {
	anointedZhIdx  map[string]*poe.Node
	ascendantZhIdx map[string]*poe.Node
	keystonesZhIdx map[string]*poe.Node
}

func NewPassiveSkillProvider() *PassiveSkillProvider {
	anointedZhCount := map[string]int{}

	anointedZhIdx := make(map[string]*poe.Node)
	for i := range poe.DATA.Anointed {
		node := &poe.DATA.Anointed[i]
		anointedZhIdx[node.Zh] = node
		anointedZhCount[node.Zh]++
	}
	// 移除重复的中文对应的索引，避免返回错误的涂油词缀翻译
	for zh, count := range anointedZhCount {
		if count > 1 {
			delete(anointedZhIdx, zh)
		}
	}

	ascendantZhIdx := make(map[string]*poe.Node)
	for i := range poe.DATA.Ascendant {
		node := &poe.DATA.Ascendant[i]
		ascendantZhIdx[node.Zh] = node
	}
	keystonesZhIdx := make(map[string]*poe.Node)
	for i := range poe.DATA.Keystones {
		node := &poe.DATA.Keystones[i]
		keystonesZhIdx[node.Zh] = node
	}

	return &PassiveSkillProvider{
		anointedZhIdx:  anointedZhIdx,
		ascendantZhIdx: ascendantZhIdx,
		keystonesZhIdx: keystonesZhIdx,
	}
}

func (p *PassiveSkillProvider) ProvideAnointedByZh(zh string) *poe.Node {
	if node, ok := p.anointedZhIdx[zh]; ok {
		return node
	}
	return nil
}

func (p *PassiveSkillProvider) ProvideAscendantByZh(zh string) *poe.Node {
	if node, ok := p.ascendantZhIdx[zh]; ok {
		return node
	}
	return nil
}

func (p *PassiveSkillProvider) ProvideKeystoneByZh(zh string) *poe.Node {
	if node, ok := p.keystonesZhIdx[zh]; ok {
		return node
	}
	return nil
}
