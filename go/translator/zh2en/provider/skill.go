package provider

import (
	"github.com/cn-poe-community/cn-poe-utils/go/data/poe"
)

type SkillProvider struct {
	zhIdx                 map[string]*poe.Skill
	indexableSupportZhIdx map[string]*poe.Skill
}

func NewSkillProvider() *SkillProvider {
	zhIdx := make(map[string]*poe.Skill)
	indexableSupportZhIdx := make(map[string]*poe.Skill)

	for i := range poe.DATA.GemSkills {
		skill := &poe.DATA.GemSkills[i]
		zhIdx[skill.Zh] = skill
	}
	for i := range poe.DATA.HybridSkills {
		skill := &poe.DATA.HybridSkills[i]
		zhIdx[skill.Zh] = skill
	}
	for i := range poe.DATA.TransfiguredSkills {
		skill := &poe.DATA.TransfiguredSkills[i]
		zhIdx[skill.Zh] = skill
	}

	for i := range poe.DATA.IndexableSupports {
		skill := &poe.DATA.IndexableSupports[i]
		indexableSupportZhIdx[skill.Zh] = skill
	}
	return &SkillProvider{
		zhIdx:                 zhIdx,
		indexableSupportZhIdx: indexableSupportZhIdx,
	}
}

func (p *SkillProvider) ProvideSkill(name string) *poe.Skill {
	if skill, ok := p.zhIdx[name]; ok {
		return skill
	}
	return nil
}

func (p *SkillProvider) ProvideIndexableSupport(name string) *poe.Skill {
	if skill, ok := p.indexableSupportZhIdx[name]; ok {
		return skill
	}
	return nil
}
