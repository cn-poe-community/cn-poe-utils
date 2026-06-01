package transform

import (
	"fmt"
	"log"
	"slices"
	"sort"

	"github.com/cn-poe-community/cn-poe-utils/go/api"
	"github.com/cn-poe-community/cn-poe-utils/go/building/util"
	"github.com/cn-poe-community/cn-poe-utils/go/data/pob"
)

// GetNodeIdOfJewelSlot 获取星团珠宝插槽的节点ID
func GetNodeIdOfJewelSlot(slotId int) int {
	return pob.DATA.Tree.JewelSlots[slotId]
}

// GetCharacterName 获取角色名称
func GetCharacterName(num int) string {
	return pob.DATA.Tree.Classes[num].Name
}

// GetAscendancyName 获取升华名称
func GetAscendancyName(characterNum int, ascendancyNum int) string {
	if ascendancyNum == 0 {
		return ""
	}
	return pob.DATA.Tree.Classes[characterNum].Ascendancies[ascendancyNum-1].Name
}

var phreciaAscendancySet = make(map[string]struct{})

func init() {
	for _, name := range pob.DATA.PhreciaAscendancyMap {
		phreciaAscendancySet[name] = struct{}{}
	}
}

// IsPhreciaAscendancy 判断是否为Phrecia升华
func IsPhreciaAscendancy(name string) bool {
	_, ok := phreciaAscendancySet[name]
	return ok
}

// JewelType 珠宝类型
type JewelType string

const (
	JewelTypeLargeClusterJewel  JewelType = "JewelPassiveTreeExpansionLarge"
	JewelTypeMediumClusterJewel JewelType = "JewelPassiveTreeExpansionMedium"
	JewelTypeSmallClusterJewel  JewelType = "JewelPassiveTreeExpansionSmall"
	// 省略了非星团珠宝的类型：基础珠宝、深渊珠宝、三项珠宝、永恒珠宝
)

func isClusterJewel(jewelType string) bool {
	return jewelType == string(JewelTypeLargeClusterJewel) ||
		jewelType == string(JewelTypeMediumClusterJewel) ||
		jewelType == string(JewelTypeSmallClusterJewel)
}

// ClusterJewelSize 星团珠宝大小
type ClusterJewelSize string

const (
	ClusterJewelSizeLarge  ClusterJewelSize = "Large Cluster Jewel"
	ClusterJewelSizeMedium ClusterJewelSize = "Medium Cluster Jewel"
	ClusterJewelSizeSmall  ClusterJewelSize = "Small Cluster Jewel"
)

var ClusterJewelSizeMap = map[JewelType]ClusterJewelSize{
	JewelTypeLargeClusterJewel:  ClusterJewelSizeLarge,
	JewelTypeMediumClusterJewel: ClusterJewelSizeMedium,
	JewelTypeSmallClusterJewel:  ClusterJewelSizeSmall,
}

// GetEnabledNodeIdsOfClusterJewels 返回所有星团上点亮的node的nodeId
func GetEnabledNodeIdsOfClusterJewels(passiveSkills *api.GetPassiveSkillsResult) []int {
	hashEx := passiveSkills.HashesEx
	jewelData := passiveSkills.JewelData
	items := passiveSkills.Items

	// 获取所有jewel，并按照从大到小进行排序
	jewelList := getOrderedClusterJewels(jewelData, items)

	hashExSet := make(map[int]struct{})
	for _, h := range hashEx {
		hashExSet[h] = struct{}{}
	}

	// 使用proxy关联插槽信息
	socketInfoMap := make(map[int]*SocketInfo)

	var allEnabledNodeIds []int
	// API数据未给星团的keystone节点分配`exId`，因此我们无法直接判断keystone节点是否被点亮。
	// 这里我们将其标记为可能点亮的，当我们每点亮一个节点，就从hashExSet移除关联的。
	// 最后我们根据hashExSet的剩余大小，来点亮相同数目的keystone，这不一定准确，但适用于大多数的情况。
	var allProbableNodeIds []int

	for _, jewel := range jewelList {
		slotId := jewel.SlotId

		var id *int
		var upSize *int

		// 只有中小型星团才可能是子星团
		if jewel.Size == ClusterJewelSizeMedium || jewel.Size == ClusterJewelSizeSmall {
			group := jewel.Data.Subgraph.Groups[fmt.Sprintf("expansion_%d", slotId)]
			proxy := util.MustAtoi(group.Proxy)
			socketInfo := socketInfoMap[proxy]
			if socketInfo != nil {
				id = &socketInfo.ID
				upSize = &socketInfo.UpSize
			}
		}

		enabledNodeIds, probableNodeIds := getEnabledNodeIdsOfClusterJewel(
			hashExSet,
			jewel,
			id,
			upSize,
			socketInfoMap,
		)

		allEnabledNodeIds = append(allEnabledNodeIds, enabledNodeIds...)
		allProbableNodeIds = append(allProbableNodeIds, probableNodeIds...)
	}

	n := min(len(hashExSet), len(allProbableNodeIds))
	if n > 0 {
		allEnabledNodeIds = append(allEnabledNodeIds, allProbableNodeIds[:n]...)
	}

	return allEnabledNodeIds
}

// ClusterJewelInfo 星团珠宝信息
type ClusterJewelInfo struct {
	SlotId int
	Item   *api.Item
	Data   *api.JewelDatum
	Size   ClusterJewelSize
}

// 获取所有星团珠宝，并按照大小降序排序
func getOrderedClusterJewels(
	jewelData api.JewelData,
	items []api.Item,
) []*ClusterJewelInfo {
	itemSlotIdIdx := make(map[int]*api.Item)
	for i := range items {
		item := &items[i]
		if item.X == nil {
			log.Printf("jewel item missing slot id(x field) %v", item)
			continue
		}
		itemSlotIdIdx[*item.X] = item
	}

	var jewelList []*ClusterJewelInfo
	for i, data := range jewelData {
		if !isClusterJewel(data.Type) {
			continue
		}
		size := ClusterJewelSizeMap[JewelType(data.Type)]

		slotId := util.MustAtoi(i)
		item := itemSlotIdIdx[slotId]
		if item == nil {
			log.Printf("cluster jewel item not found for slotId %d", slotId)
			continue
		}

		jewelList = append(jewelList, &ClusterJewelInfo{
			SlotId: slotId,
			Item:   item,
			Data:   &data,
			Size:   size,
		})
	}

	slices.SortFunc(jewelList, func(a, b *ClusterJewelInfo) int {
		sizeA := a.Size
		sizeB := b.Size
		// 字符串的自然序"LARGE"<"MEDIUM"<"SMALL"，与实际顺序相反
		// 这里我们需要逆序，所以使用自然序
		if sizeA < sizeB {
			return -1
		} else if sizeA > sizeB {
			return 1
		}
		return 0
	})
	return jewelList
}

// ClusterJewelNode 星团珠宝节点
type ClusterJewelNode struct {
	ID   int // nodeId
	OIdx int // 局部序号，使用0~11标记单个星团中的节点
}

// SocketInfo POB在递归构建子星团时，父星团向子星团传递的数据
type SocketInfo struct {
	ID     int
	UpSize int
}

// 返回单个星团上点亮的节点的nodeId。算法移植自PassiveSpec.lua文件的BuildSubgraph()方法。
func getEnabledNodeIdsOfClusterJewel(
	hashExSet map[int]struct{},
	jewelInfo *ClusterJewelInfo,
	id *int,
	upSize *int,
	socketInfos map[int]*SocketInfo,
) (enabledNodeIds []int, probableNodeIds []int) {
	slotNodeId := GetNodeIdOfJewelSlot(jewelInfo.SlotId)
	expansionJewel := pob.DATA.Tree.Nodes[slotNodeId].ExpansionJewel

	if expansionJewel == nil {
		log.Printf("expansion jewel data for slotId is missing %d", jewelInfo.SlotId)
		return
	}

	jSize := jewelInfo.Size
	clusterJewel := pob.DATA.ClusterJewels.Jewels[string(jSize)]

	idVal := 0x10000
	if id != nil {
		idVal = *id
	}
	if expansionJewel.Size == 2 {
		idVal += (expansionJewel.Index << 6)
	} else if expansionJewel.Size == 1 {
		idVal += (expansionJewel.Index << 9)
	}
	nodeId := idVal + (clusterJewel.SizeIndex << 4)

	proxyNode := pob.DATA.Tree.Nodes[util.MustAtoi(expansionJewel.Proxy)]
	proxyGroup := pob.DATA.Tree.Groups[proxyNode.Group]

	group := jewelInfo.Data.Subgraph.Groups[fmt.Sprintf("expansion_%d", jewelInfo.SlotId)]
	exIds := make([]int, 0, len(group.Nodes))
	for _, n := range group.Nodes {
		exId := util.MustAtoi(n)
		exIds = append(exIds, exId)
	}
	exNodes := jewelInfo.Data.Subgraph.Nodes

	// 传奇小星团珠宝
	isUnique := jewelInfo.Item.Rarity != nil && *jewelInfo.Item.Rarity == api.RarityUnique
	if len(exIds) == 0 && len(exNodes) == 0 && isUnique {
		probableNodeIds = append(probableNodeIds, nodeId)
		return
	}

	// 非传奇小星团珠宝上的节点分为三类：notable、socket和small
	var notableExIds []int
	var socketExIds []int
	var smallExIds []int

	for _, exId := range exIds {
		node := exNodes[exId]
		if node.IsNotable != nil && *node.IsNotable {
			notableExIds = append(notableExIds, exId)
		} else if node.IsJewelSocket != nil && *node.IsJewelSocket {
			socketExIds = append(socketExIds, exId)
		} else if node.IsMastery != nil && *node.IsMastery {
			// 目前星团珠宝的专精节点是无效数据
		} else {
			smallExIds = append(smallExIds, exId)
		}
	}

	nodeCount := len(notableExIds) + len(socketExIds) + len(smallExIds)

	var clusterJewelNodes []*ClusterJewelNode
	// 使用局部序号(0~11)标记星团中的节点
	indicies := make(map[int]*ClusterJewelNode)
	var notableIndicies []int
	var smallIndicies []int

	if jSize == ClusterJewelSizeLarge && len(socketExIds) == 1 {
		socket := exNodes[socketExIds[0]]
		skill := util.MustAtoi(socket.Skill)
		node := &ClusterJewelNode{
			ID:   skill,
			OIdx: 6,
		}
		clusterJewelNodes = append(clusterJewelNodes, node)
		indicies[node.OIdx] = node
	} else {
		getJewels := []int{0, 2, 1}
		for i := 0; i < len(socketExIds); i++ {
			nodeIndex := clusterJewel.SocketIndicies[i]
			jewelIndex := getJewels[i]
			socket := findSocket(proxyGroup, jewelIndex)
			if socket == nil {
				log.Println("socket not found")
				continue
			}

			node := &ClusterJewelNode{
				ID:   socket.ID,
				OIdx: nodeIndex,
			}
			clusterJewelNodes = append(clusterJewelNodes, node)
			indicies[node.OIdx] = node
		}
	}

	for _, n := range clusterJewel.NotableIndicies {
		if len(notableIndicies) == len(notableExIds) {
			break
		}

		if jSize == ClusterJewelSizeMedium {
			if len(socketExIds) == 0 && len(notableExIds) == 2 {
				if n == 6 {
					n = 4
				} else if n == 10 {
					n = 8
				}
			} else if nodeCount == 4 {
				if n == 10 {
					n = 9
				} else if n == 2 {
					n = 3
				}
			}
		}
		if _, ok := indicies[n]; !ok {
			notableIndicies = append(notableIndicies, n)
		}
	}
	sort.Ints(notableIndicies)

	for i := 0; i < len(notableIndicies); i++ {
		idx := notableIndicies[i]
		node := &ClusterJewelNode{
			ID:   nodeId + idx,
			OIdx: idx,
		}
		clusterJewelNodes = append(clusterJewelNodes, node)
		indicies[idx] = node
	}

	for _, n := range clusterJewel.SmallIndicies {
		if len(smallIndicies) == len(smallExIds) {
			break
		}

		idx := n
		if jSize == ClusterJewelSizeMedium {
			if nodeCount == 5 && n == 4 {
				idx = 3
			} else if nodeCount == 4 {
				if n == 8 {
					idx = 9
				} else if n == 4 {
					idx = 3
				}
			}
		}
		if _, exists := indicies[idx]; !exists {
			smallIndicies = append(smallIndicies, idx)
		}
	}

	for i := 0; i < len(smallIndicies); i++ {
		idx := smallIndicies[i]
		node := &ClusterJewelNode{
			ID:   nodeId + idx,
			OIdx: idx,
		}
		clusterJewelNodes = append(clusterJewelNodes, node)
		indicies[idx] = node
	}

	groupSize := expansionJewel.Size
	upSizeVal := 0
	if upSize != nil {
		upSizeVal = *upSize
	}

	for clusterJewel.SizeIndex < groupSize {
		result := findSocket(proxyGroup, 1)
		if result == nil {
			result = findSocket(proxyGroup, 0)
		}
		if result == nil {
			log.Printf("socket not found %s", expansionJewel.Proxy)
			return
		}

		socket := result.Node

		if socket.ExpansionJewel == nil {
			log.Println("socket has no expansion jewel")
			return
		}

		proxyNode = pob.DATA.Tree.Nodes[util.MustAtoi(socket.ExpansionJewel.Proxy)]
		proxyGroup = pob.DATA.Tree.Groups[proxyNode.Group]
		groupSize = socket.ExpansionJewel.Size
		upSizeVal++
	}

	translatedIndicies := make(map[int]*ClusterJewelNode)

	proxyNodeSkillsPerOrbit := pob.DATA.Tree.Constants.SkillsPerOrbit[proxyNode.Orbit]
	for _, node := range clusterJewelNodes {
		proxyNodeOidxRelativeToClusterIndicies := translateOidx(
			proxyNode.OrbitIndex,
			proxyNodeSkillsPerOrbit,
			clusterJewel.TotalIndicies,
		)
		correctedNodeOidxRelativeToClusterIndicies := (node.OIdx + proxyNodeOidxRelativeToClusterIndicies) % clusterJewel.TotalIndicies
		correctedNodeOidxRelativeToTreeSkillsPerOrbit := translateOidx(
			correctedNodeOidxRelativeToClusterIndicies,
			clusterJewel.TotalIndicies,
			proxyNodeSkillsPerOrbit,
		)
		node.OIdx = correctedNodeOidxRelativeToTreeSkillsPerOrbit
		translatedIndicies[node.OIdx] = node
	}

	if jewelInfo.Size == ClusterJewelSizeSmall {
		// 算法对 orbitIndex 进行了转换，但目前对于小星团珠宝的转换结果是错误的
		// 需要使用其它办法
		orderedIndicies := make([]int, 0, len(indicies))
		for k := range indicies {
			orderedIndicies = append(orderedIndicies, k)
		}
		sort.Ints(orderedIndicies)

		orderedNodes := getSmallClusterJewelOrderedNodes(jewelInfo.Data)
		if len(orderedNodes) == 0 {
			log.Println("empty ordered nodes")
		} else {
			for i := 0; i < len(orderedNodes); i++ {
				exId := orderedNodes[i].ExId
				if _, exists := hashExSet[exId]; exists {
					clusterJewelNode := indicies[orderedIndicies[i]]
					if clusterJewelNode != nil {
						enabledNodeIds = append(enabledNodeIds, clusterJewelNode.ID)
					}
					delete(hashExSet, exId)
				}
			}
		}
	} else {
		for _, exId := range exIds {
			node := exNodes[exId]
			if _, exists := hashExSet[exId]; exists {
				clusterJewelNode := translatedIndicies[node.OrbitIndex]
				if clusterJewelNode != nil {
					enabledNodeIds = append(enabledNodeIds, clusterJewelNode.ID)
				}
				delete(hashExSet, exId)
			}
		}
	}

	for _, exId := range socketExIds {
		node := exNodes[exId]
		if node.ExpansionJewel != nil {
			socketInfos[util.MustAtoi(node.ExpansionJewel.Proxy)] = &SocketInfo{
				ID:     idVal,
				UpSize: upSizeVal,
			}
		}
	}

	return
}

// SocketResult 插槽查找结果
type SocketResult struct {
	ID   int
	Node *pob.Node
}

func findSocket(
	group pob.Group,
	index int,
) *SocketResult {
	for _, nodeId := range group.Nodes {
		node := pob.DATA.Tree.Nodes[nodeId]
		if node.ExpansionJewel != nil && node.ExpansionJewel.Index == index {
			return &SocketResult{
				ID:   nodeId,
				Node: &node,
			}
		}
	}
	return nil
}

func translateOidx(srcOidx int, srcNodesPerOrbit int, destNodesPerOrbit int) int {
	if srcNodesPerOrbit == destNodesPerOrbit {
		return srcOidx
	} else if srcNodesPerOrbit == 12 && destNodesPerOrbit == 16 {
		return []int{0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15}[srcOidx]
	} else if srcNodesPerOrbit == 16 && destNodesPerOrbit == 12 {
		return []int{0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11}[srcOidx]
	} else {
		return (srcOidx * destNodesPerOrbit) / srcNodesPerOrbit
	}
}

// OrderedNode 按顺序排列的节点
type OrderedNode struct {
	ExId int
	Node *api.Node
}

// 按从连接父插槽的第一个节点开始的单向顺序返回小星团珠宝的所有节点
func getSmallClusterJewelOrderedNodes(
	jewelDatum *api.JewelDatum,
) []OrderedNode {
	nodes := jewelDatum.Subgraph.Nodes

	exIds := make([]int, 0, len(nodes))
	for id := range nodes {
		exIds = append(exIds, id)
	}

	startExId := -1
	for exId, node := range nodes {
		inId := util.MustAtoi(node.In[0])
		found := false
		for _, id := range exIds {
			if id == inId {
				found = true
				break
			}
		}
		if !found {
			startExId = exId
			break
		}
	}

	if startExId == -1 {
		return nil
	}

	var result []OrderedNode
	// 目前小型星团珠宝是有向无环图，但需要避免恶意数据或版本更新导致死循环
	visited := make(map[int]struct{})

	exId := startExId
	for {
		if _, exists := visited[exId]; exists {
			break
		}
		visited[exId] = struct{}{}
		node := nodes[exId]
		result = append(result, OrderedNode{
			ExId: exId,
			Node: &node,
		})

		if len(node.Out) > 0 {
			exId = util.MustAtoi(node.Out[0])
		} else {
			break
		}
	}

	return result
}
