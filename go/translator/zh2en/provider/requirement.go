package provider

import (
	"github.com/cn-poe-community/cn-poe-utils/go/data/poe"
)

type RequirementProvider struct {
	zhIdx       map[string]*poe.Requirement
	suffixZhIdx map[string]*poe.RequirementSuffix
}

func NewRequirementProvider() *RequirementProvider {
	zhIdx := make(map[string]*poe.Requirement)
	suffixZhIdx := make(map[string]*poe.RequirementSuffix)

	for i := range poe.DATA.Requirements {
		req := &poe.DATA.Requirements[i]
		zhIdx[req.Zh] = req
	}
	for i := range poe.DATA.RequirementSuffixes {
		suffix := &poe.DATA.RequirementSuffixes[i]
		suffixZhIdx[suffix.Zh] = suffix
	}

	return &RequirementProvider{
		zhIdx:       zhIdx,
		suffixZhIdx: suffixZhIdx,
	}
}

func (p *RequirementProvider) ProvideByZh(zh string) *poe.Requirement {
	if req, ok := p.zhIdx[zh]; ok {
		return req
	}
	return nil
}

func (p *RequirementProvider) ProvideSuffixByZh(zh string) *poe.RequirementSuffix {
	if suffix, ok := p.suffixZhIdx[zh]; ok {
		return suffix
	}
	return nil
}
