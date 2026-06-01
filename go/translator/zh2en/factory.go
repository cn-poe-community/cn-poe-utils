package zh2en

import (
	"github.com/cn-poe-community/cn-poe-utils/go/translator/zh2en/provider"
)

type TranslatorFactory struct {
	basicTranslator *BasicTranslator
	jsonTranslator  *JsonTranslator
}

func NewTranslatorFactory() *TranslatorFactory {
	attributeProvider := provider.NewAttributeProvider()
	baseTypeProvider := provider.NewBaseTypeProvider()
	requirementProvider := provider.NewRequirementProvider()
	propertyProvider := provider.NewPropertyProvider()
	passiveSkillProvider := provider.NewPassiveSkillProvider()
	skillProvider := provider.NewSkillProvider()
	statProvider := provider.NewStatProvider()
	stringProvider := provider.NewStringProvider()

	basicTranslator := NewBasicTranslator(
		attributeProvider,
		baseTypeProvider,
		passiveSkillProvider,
		propertyProvider,
		requirementProvider,
		skillProvider,
		statProvider,
		stringProvider,
	)
	jsonTranslator := NewJsonTranslator(basicTranslator)

	return &TranslatorFactory{
		basicTranslator: basicTranslator,
		jsonTranslator:  jsonTranslator,
	}
}

func (f *TranslatorFactory) GetBasicTranslator() *BasicTranslator {
	return f.basicTranslator
}

func (f *TranslatorFactory) GetJsonTranslator() *JsonTranslator {
	return f.jsonTranslator
}
