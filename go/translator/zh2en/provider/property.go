package provider

import (
	"strings"

	"github.com/cn-poe-community/cn-poe-utils/go/data/poe"
	"github.com/cn-poe-community/cn-poe-utils/go/translator/zh2en/util"
)

const VARIABLE_PLACEHOLDER = "{0}"

type PropertyProvider struct {
	zhIdx         map[string]*poe.Property
	zhSkeletonIdx map[string][]*poe.Property
}

func NewPropertyProvider() *PropertyProvider {
	zhIdx := make(map[string]*poe.Property)
	zhSkeletonIdx := make(map[string][]*poe.Property)

	for i := range poe.DATA.Properties {
		prop := &poe.DATA.Properties[i]

		if strings.Contains(prop.Zh, VARIABLE_PLACEHOLDER) {
			zhSkeletonIdx[util.GetTextSkeleton(prop.Zh)] =
				append(zhSkeletonIdx[util.GetTextSkeleton(prop.Zh)], prop)
		} else {
			zhIdx[prop.Zh] = prop
		}
	}
	return &PropertyProvider{
		zhIdx:         zhIdx,
		zhSkeletonIdx: zhSkeletonIdx,
	}
}

func (p *PropertyProvider) ProvideByZh(zh string) *poe.Property {
	if prop, ok := p.zhIdx[zh]; ok {
		return prop
	}
	return nil
}

func (p *PropertyProvider) ProvideVariablePropertiesByZhSkeleton(skeleton string) []*poe.Property {
	if props, ok := p.zhSkeletonIdx[skeleton]; ok {
		return props
	}
	return nil
}
