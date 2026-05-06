package xml

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/cn-poe-community/cn-poe-utils/go/api"
	"github.com/cn-poe-community/cn-poe-utils/go/building/util"
)

// Skills 技能集合
type Skills struct {
	SkillSet *SkillSet
}

func NewSkills() *Skills {
	return &Skills{
		SkillSet: NewSkillSet(),
	}
}

// String 返回XML字符串
func (s *Skills) String() string {
	return fmt.Sprintf(`<Skills activeSkillSet="1">
%s
</Skills>`, s.SkillSet.String())
}

// SkillSet 技能集合
type SkillSet struct {
	Skills []*Skill
}

func NewSkillSet() *SkillSet {
	return &SkillSet{
		Skills: []*Skill{},
	}
}

// String 返回XML字符串
func (ss *SkillSet) String() string {
	var skillsView []string
	for _, skill := range ss.Skills {
		skillsView = append(skillsView, skill.String())
	}
	return fmt.Sprintf(`<SkillSet id="1">
%s
</SkillSet>`, strings.Join(skillsView, "\n"))
}

// Skill 技能
type Skill struct {
	Slot          string
	Gems          []*Gem
	ImbuedSupport string
}

func NewSkill(slotName string, jsonList []*api.Item) *Skill {
	skill := &Skill{
		Slot: slotName,
		Gems: []*Gem{},
	}
	for _, json := range jsonList {
		gem, buildInSupport := parseJson(json)
		skill.Gems = append(skill.Gems, gem)
		if buildInSupport != nil {
			skill.ImbuedSupport = buildInSupport.NameSpec
		}
	}
	return skill
}

// String 返回XML字符串
func (s *Skill) String() string {
	var gemsView []string
	for _, gem := range s.Gems {
		gemsView = append(gemsView, gem.String())
	}
	if s.ImbuedSupport == "" {
		return fmt.Sprintf(`<Skill enabled="true" slot="%s" mainActiveSkill="nil">
%s
</Skill>`, s.Slot, strings.Join(gemsView, "\n"))
	}
	return fmt.Sprintf(`<Skill enabled="true" slot="%s" mainActiveSkill="nil" imbuedSupport="%s">
%s
</Skill>`, s.Slot, s.ImbuedSupport, strings.Join(gemsView, "\n"))
}

// Gem 宝石
type Gem struct {
	Level         int
	QualityId     string
	Quality       int
	NameSpec      string
	EnableGlobal1 bool
	EnableGlobal2 bool
}

func parseJson(json *api.Item) (*Gem, *Gem) {
	propMap := make(map[string]*api.Property)
	if json.Properties != nil {
		for i := range json.Properties {
			prop := &json.Properties[i]
			propMap[prop.Name] = prop
		}
	}

	level := 20
	if propMap["Level"] != nil && len(propMap["Level"].Values) > 0 {
		level = util.ParseIntOrDefault(propMap["Level"].Values[0].Value, 20)
	}

	quality := 0
	if propMap["Quality"] != nil && len(propMap["Quality"].Values) > 0 {
		quality = util.ParseIntOrDefault(propMap["Quality"].Values[0].Value, 0)
	}

	nameSpec := strings.Replace(json.BaseType, " Support", "", 1)

	if json.Hybrid != nil && json.Hybrid.IsVaalGem != nil && *json.Hybrid.IsVaalGem {
		hybridBaseTypeName := json.Hybrid.BaseTypeName
		if util.IsTransfiguredSkill(hybridBaseTypeName) {
			nameSpec = nameSpecOfVaalTransfiguredGem(hybridBaseTypeName)
		}
	}

	gem := &Gem{
		Level:         level,
		QualityId:     "Default",
		Quality:       quality,
		NameSpec:      nameSpec,
		EnableGlobal1: true,
		EnableGlobal2: false,
	}

	if gem.IsVaalGem() {
		gem.EnableGlobal1 = false
		gem.EnableGlobal2 = true
	}

	var buildInSupport *Gem

	// 处理内置辅助技能
	if json.BuiltInSupport != nil {
		builtInSupport := *json.BuiltInSupport
		re := regexp.MustCompile(`Supported by Level (\d+) (.+)`)
		match := re.FindStringSubmatch(builtInSupport)
		if len(match) == 3 {
			supportLevel := util.ParseIntOrDefault(match[1], 1)
			supportName := match[2]
			buildInSupport = &Gem{
				Level:         supportLevel,
				QualityId:     "Default",
				Quality:       0,
				NameSpec:      supportName,
				EnableGlobal1: true,
				EnableGlobal2: false,
			}
		} else {
			fmt.Printf("Failed to parse gem builtInSupport: %s\n", builtInSupport)
		}
	}

	return gem, buildInSupport
}

func nameSpecOfVaalTransfiguredGem(transfiguredGemName string) string {
	return "Vaal " + transfiguredGemName
}

// IsVaalGem 判断是否为瓦尔宝石
func (g *Gem) IsVaalGem() bool {
	return len(g.NameSpec) > 5 && g.NameSpec[:5] == "Vaal "
}

// String 返回XML字符串
func (g *Gem) String() string {
	return fmt.Sprintf(`<Gem level="%d" qualityId="%s" quality="%d" nameSpec="%s" enabled="true" enableGlobal1="%t" enableGlobal2="%t"/>`,
		g.Level, g.QualityId, g.Quality, g.NameSpec, g.EnableGlobal1, g.EnableGlobal2)
}
