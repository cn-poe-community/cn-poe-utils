package provider

import (
	"github.com/cn-poe-community/cn-poe-utils/go/data/poe"
)

type StringProvider struct {
	idx map[string]*poe.ClientString
}

func NewStringProvider() *StringProvider {
	idx := make(map[string]*poe.ClientString)
	for i := range poe.DATA.Strings {
		item := &poe.DATA.Strings[i]
		idx[item.Id] = item
	}
	return &StringProvider{
		idx: idx,
	}
}

func (p *StringProvider) MustProvide(id string) *poe.ClientString {
	if item, ok := p.idx[id]; ok {
		return item
	}
	panic("string not found of id: " + id)
}
