package building

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/cn-poe-community/cn-poe-utils/go/api"
	"github.com/cn-poe-community/cn-poe-utils/go/translator/zh2en"
)

func MustReadFile(path string, t *testing.T) []byte {
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Failed to read %s: %v", path, err)
	}
	return data
}

func MustUnmarshal(data []byte, v any, t *testing.T, context string) {
	if err := json.Unmarshal(data, v); err != nil {
		t.Fatalf("Failed to unmarshal %s: %v", context, err)
	}
}

func TestTransform(t *testing.T) {

	var items api.GetItemsResult
	var passiveSkills api.GetPassiveSkillsResult

	MustUnmarshal(MustReadFile("../api/testdata/items.json", t), &items, t, "items")
	MustUnmarshal(MustReadFile("../api/testdata/passive_skills.json", t), &passiveSkills, t, "passiveSkills")

	factory := zh2en.NewTranslatorFactory()
	jsonTranslator := factory.GetJsonTranslator()

	jsonTranslator.TransItems(&items)
	jsonTranslator.TransPassiveSkills(&passiveSkills)

	options := &TransformOptions{}
	pob := Transform(&items, &passiveSkills, options)

	xmlContent := pob.String()
	err := os.WriteFile("D:\\AppsInDisk\\PathOfBuildingCommunity\\Builds\\test-go.xml", []byte(xmlContent), 0644)
	if err != nil {
		t.Fatalf("写入XML文件失败: %v", err)
	}
}
