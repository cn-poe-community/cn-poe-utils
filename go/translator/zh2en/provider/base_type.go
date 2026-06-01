package provider

import (
	"github.com/cn-poe-community/cn-poe-utils/go/data/poe"
)

// BaseTypeProvider 基础类型提供者
type BaseTypeProvider struct {
	zhIdx map[string][]*poe.BaseType
}

func NewBaseTypeProvider() *BaseTypeProvider {
	// 所有基础类型
	list := [][]poe.BaseType{
		poe.DATA.Amulets,
		poe.DATA.Belts,
		poe.DATA.BodyArmours,
		poe.DATA.Boots,
		poe.DATA.Flasks,
		poe.DATA.Gloves,
		poe.DATA.Helmets,
		poe.DATA.Jewels,
		poe.DATA.Quivers,
		poe.DATA.Rings,
		poe.DATA.Shields,
		poe.DATA.Tattoos,
		poe.DATA.Tinctures,
		poe.DATA.Weapons,
	}

	zhIdx := make(map[string][]*poe.BaseType)
	for _, baseTypes := range list {
		for i := range baseTypes {
			baseType := &baseTypes[i]
			zhIdx[baseType.Zh] = append(zhIdx[baseType.Zh], baseType)
		}
	}

	return &BaseTypeProvider{
		zhIdx: zhIdx,
	}
}

// ProvideByZh 根据中文基础类型名提供基础类型
func (p *BaseTypeProvider) ProvideByZh(zh string) []*poe.BaseType {
	if baseTypes, ok := p.zhIdx[zh]; ok {
		return baseTypes
	}
	return nil
}
