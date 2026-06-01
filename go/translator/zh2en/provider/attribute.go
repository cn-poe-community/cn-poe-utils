package provider

import "github.com/cn-poe-community/cn-poe-utils/go/data/poe"

type AttributeProvider struct {
	zhIdx map[string]*poe.Attribute
}

func NewAttributeProvider() *AttributeProvider {
	zhIdx := make(map[string]*poe.Attribute)
	for i := range poe.DATA.Attributes {
		attr := &poe.DATA.Attributes[i]
		zhIdx[attr.Zh] = attr
	}
	return &AttributeProvider{
		zhIdx: zhIdx,
	}
}

func (p *AttributeProvider) ProvideByZh(zh string) *poe.Attribute {
	if attr, ok := p.zhIdx[zh]; ok {
		return attr
	}

	return nil
}
