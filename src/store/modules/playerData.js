import PlayerSounds from '@/plugins/PlayerSounds.js'
import UiSounds from '@/plugins/UiSounds.js'

const state = () => ({
    info:  {
      name:"swordsman",
      type:'player', 
      portrait:require("@/assets/imgs/playableCharacters/swordsman.png"), 
      description1:"Slicing and Dicing",
      description2:"Bruiser class, high damage, good armor, high health.", 
      coins:99, baseHealth:12, baseArmor:2, baseAttackMax:8, attackType: "physical",
      attackTypeImage: require("@/assets/imgs/icons/physicalIcon.png"),
      mettleImg: require("@/assets/imgs/icons/swordsmanMettle.png"),
      mettle: 1,
      curse:0,
      special: "en'garde",
      specialDescription:"Spend one mettle to gain +2 Armor for this encounter.",
    },
    permenantTraits: [],
    temporaryTraits: [],
    tempArmor:0,
    tempHealth:0,
    tempAttackMax:0,
    thisDamage: 0,
    specialDamage:0,
    specialDamageAnimation:false,
    log: [],
    logNum: 0,
    animations: {
      blocking: false,
      hurt: false,
      attacking:false,
      portEffect: false,
      redShine: false,
      purpleShine: false,
      greenShine: false,
      goldShine:false,
      yellowShine: true,
      blueShine:false,
      isDead: false,
    },
})

const mutations = {
  addToInventory(state, payload) {
    if(payload.type === 'temporary') {
      state.temporaryTraits.push(payload);
    }
    else if (payload.type === "permanent") {
      state.permenantTraits.push(payload);
    }
  },
  mutate(state, payload) {
    state[payload.property] = payload.with;
  },
  mutateInfo(state, payload) {
    state.info[payload.property] = payload.with;
  },
  changeStats(state, payload){
    if (payload.operator === 'add') state.info[payload.stat] += payload.value;
    else if (payload.operator === 'minus') state.info[payload.stat] -= payload.value;
    else if (payload.operator === 'multiply') state.info[payload.stat] *= payload.value;
    else if (payload.operator === 'divide') Math.ceil(state.info[payload.stat] /= payload.value);
  },
  transferStat(state, payload){
    if(payload.operator === 'divide'){
      let statModified = Math.ceil(state.info[payload.fromStat] / payload.value);
      let transferAmount = state.info[payload.fromStat] - statModified;
      state.info[payload.fromStat] = statModified;
      state.info[payload.toStat] += transferAmount;
    }
  },
  toggleAnimation(state, payload) {
    state.animations[payload.property] = !state.animations[payload.property];
  },
  incrementLog(state) {
    state.logNum++
  },
  addToLog(state, payload){
    state.log.push(payload)
  },
  takeDamage(state, payload) {
    state.info.baseHealth -= payload.damage;
  },
  addCoins(state, payload) {
    state.info.coins += payload
  },
  buyItem(state, payload) {
    state.info.coins -= payload
  },

  //SHOPKEEPER MUTATIONS
  heal(state, payload) {
    state.info.baseHealth += payload
  },
  halveHP(state) {
    state.info.baseHealth = Math.ceil(state.info.baseHealth / 2);
  },
  addArmor(state, payload) {
    state.info.baseArmor += payload
  },
  addAttack(state, payload) {
    state.info.baseAttackMax += payload
  },
  physicalAttackType(state) {
    state.info.attackType = 'physical';
    state.info.attackTypeImage = 'require("@/assets/imgs/icons/physicalIcon.png")'
  },
  doubleAttack(state) {
    state.info.baseAttackMax *= 2;
  },
  halveArmor(state) {
    state.info.baseArmor = Math.floor(state.info.baseArmor / 2)
  },
}

const getters = {
  thisAdjDamage: (state, getters, rootState, rootGetters) => {
    let num;
    if( state.info.attackType === 'physical') {
      num = state.thisDamage - rootGetters['monsterData/calcArmor']
    }
    else if ( state.info.attackType === 'magical') {
      num = state.thisDamage;
    }
    if(num <= 0) return 0
    else return num
  },
  playerLog: (state) => {
    let maxLog = state.log
    if(maxLog.length > 4) {
      maxLog.shift();
    }
    return maxLog
  },
  calcHealth: (state) => {
    return state.tempHealth + state.info.baseHealth
  },
  calcArmor: (state) => {
    return state.tempArmor + state.info.baseArmor
  },
  calcAttackMax: (state) => {
    return state.tempAttackMax + state.info.baseAttackMax
  },
  varletCrit: (state, getters) => {
    return Math.floor(getters.calcAttackMax - (getters.calcAttackMax / 4));
  },
  inventory: (state, getters) => {
    let fullInventory = state.temporaryTraits.concat(state.permenantTraits);
    return fullInventory;
  }
}

const actions = {
  CHECK_HP({state, commit, dispatch}){
    if(state.info.baseHealth > 0){
      //UNLOCK COMBAT
      commit('gameData/toggle', { property:'combatLocked' }, {root: true});
      commit('authData/updateSavedGame', state.info, {root:true} )
    }
    else if (state.info.baseHealth <= 0) {
      dispatch('RESET_ANIMATIONS')
      commit('toggleAnimation', {property: 'isDead'})
      PlayerSounds.playerDead.play()
      setTimeout(() => {
        commit('gameData/mutate', {property: 'phase', with:'LoseScreen'}, {root:true})
      }, 1200)
    }
  },
  ROLL_DAMAGE({commit, state, getters}) {
    const randomRoll = Math.floor(Math.random() * (getters.calcAttackMax) + 1)
    commit('mutate', {property:'thisDamage', with:randomRoll})
    let randomAttackSound = Math.floor(Math.random() * (3) + 1)
    if (state.info.attackType === 'physical') {
      PlayerSounds['playerMelee' + randomAttackSound].play();
    }
  },
  //RUNS WHEN TRADE BLOWS IS CLICKED
  TRADE_BLOWS({dispatch, commit, getters, rootState}){
      if (!rootState.gameData.combatLocked) {
        //LOCK COMBAT
        commit('gameData/toggle', {property:'combatLocked'}, {root: true});
        //ROLL FOR DAMAGE
        dispatch('ROLL_DAMAGE')
        //DEAL THAT DAMAGE
        dispatch('DEAL_DAMAGE')
        //WAIT THEN RUN TRADE BLOWS FOR MONSTERS
        setTimeout(() => {
          dispatch('monsterData/TRADE_BLOWS', null, {root:true})
        },1500)
      }
  },
  LOG_UPDATE({commit, state}, payload) {
    commit('addToLog', {id:state.logNum + 'player', message:payload});
    commit('incrementLog')
  },
  DEAL_DAMAGE({commit, dispatch, getters}) {
      commit('toggleAnimation', {property:'attacking'});
      if (getters.thisAdjDamage > 0) {
        dispatch('LOG_UPDATE', `DEALT ${getters.thisAdjDamage} DAMAGE`)
        commit('monsterData/toggleAnimation', {property: 'hurt'}, {root:true})
        commit('monsterData/toggleAnimation', {property: 'portEffect'}, {root:true})
        commit('monsterData/toggleAnimation', {property: 'redShine'}, {root:true})
        commit('monsterData/takeDamage', {damage: getters.thisAdjDamage}, {root:true})
        commit('gameData/addToTracker', {what:'damageDealt', with:getters.thisAdjDamage}, {root:true})
      }
      else if(getters.thisAdjDamage <= 0) {
        dispatch('LOG_UPDATE', `ATTACK BLOCKED`)
        commit('monsterData/toggleAnimation', {property: 'blocking'}, {root: true})
        commit('monsterData/toggleAnimation', {property: 'portEffect'}, {root:true})
        commit('monsterData/toggleAnimation', {property: 'purpleShine'}, {root:true})
      }
  },
  RUN_SPECIAL({state, commit, getters, dispatch, rootState}){
    if (state.info.mettle > 0 && !rootState.gameData.combatLocked){
      // LOCK COMBAT
      commit('gameData/toggle', {property:'combatLocked'}, {root: true});
      commit('toggleAnimation', {property: 'portEffect'})

      if(state.info.name === 'swordsman') {
        commit('toggleAnimation', {property: 'goldShine'})
        commit('mutate', {property: 'tempArmor', with:state.tempArmor+=2})
        PlayerSounds.armorUp.play();
        dispatch('LOG_UPDATE', `+2 ARM`);
      }
      else if (state.info.name === 'mage') {
        commit('toggleAnimation', {property: 'blueShine'})
        dispatch('DEAL_SPECIAL_DAMAGE', 12)
        PlayerSounds.variagate.play();
        dispatch('LOG_UPDATE', `VARIAGATE DEALT 12 DAMAGE`);
      }
      else if (state.info.name === 'varlet') {
        commit('toggleAnimation', {property: 'yellowShine'})
        dispatch('DEAL_SPECIAL_DAMAGE', getters.varletCrit)
        PlayerSounds.backstab.play();
        dispatch('LOG_UPDATE', `BACKSTAB DEALT ${getters.varletCrit} DAMAGE`);
      }

      commit('changeStats', {stat:'mettle', value:1, operator:'minus'});
        setTimeout(() => {
          commit('gameData/toggle', {property:'combatLocked'}, {root: true});
          dispatch('RESET_ANIMATIONS');
        }, 1200)

    }
  },
  DEAL_SPECIAL_DAMAGE({commit, getters, dispatch}, dealtDamage) {
    commit('monsterData/toggleAnimation', {property: 'redShine'}, {root:true})
    commit('mutate', {property:'specialDamageAnimation', with:true})
    commit('mutate', {property:'specialDamage', with:dealtDamage})
    commit('monsterData/takeDamage', {damage: dealtDamage}, {root:true})
    // Track Special Damage
    commit('gameData/addToTracker', {what:'damageDealt', with:dealtDamage}, {root:true})
    setTimeout(() => {
      dispatch('RESET_ANIMATIONS');
      commit('mutate', {property:'specialDamageAnimation', with:false})
      dispatch('monsterData/CHECK_HP', null, {root: true})
    }, 1200)

  },
  TURN_TAIL({commit, dispatch, state, rootState}){
      if(!rootState.gameData.turnTailUsed) {
        // Lock Controls
        commit('gameData/toggle', {property:'combatLocked'}, {root: true});
        
        //calculate success chance
        let monsterRoll = Math.floor(Math.random()*6);
        let playerRoll = Math.floor(Math.random()*6);
        let monsterCalc = monsterRoll + rootState.monsterData.info.baseHealth
        let playerCalc = playerRoll + state.info.baseHealth
        
        UiSounds.escape.play();
        
        // Updating Log
        dispatch('LOG_UPDATE', `YOU'RE TURNING TAIL`);
        dispatch('monsterData/LOG_UPDATE', `THE MONSTER LUNGES`, {root:true})
        
        // Initial Turn Tail Ambiguous Purple Animation
        commit('toggleAnimation', {property: 'portEffect'})
        commit('toggleAnimation', {property: 'purpleShine'})
        commit('monsterData/toggleAnimation', {property: 'portEffect'}, {root:true})
        commit('monsterData/toggleAnimation', {property: 'purpleShine'}, {root:true})
        
        setTimeout(() => {
          //PLAYER ESCAPES
          if(monsterCalc >= playerCalc) {
            dispatch('RESET_ANIMATIONS');
            dispatch('monsterData/RESET_ANIMATIONS', null, {root:true});
            dispatch('ESCAPE')
          }
          //PLAYER CANT ESCAPE
          else {
            dispatch('RESET_ANIMATIONS');
            dispatch('monsterData/RESET_ANIMATIONS', null, {root:true});
            dispatch('CAUGHT')
          }
        },1200)
      } 
    },
  ESCAPE({commit, dispatch}){
    commit('toggleAnimation', {property: 'portEffect'})
    commit('toggleAnimation', {property: 'greenShine'})
    dispatch('LOG_UPDATE', `YOU GOT AWAY.`);
    setTimeout(() => {
      commit('gameData/mutate', {property: 'phase', with:'ShopSelect'}, {root:true})
      dispatch('RESET_ANIMATIONS')
    }, 1200)
  },
  CAUGHT({commit, dispatch}) {
    commit('gameData/mutate', {property:'turnTailUsed', with:true}, {root: true});
    dispatch('LOG_UPDATE', `CAN'T GET AWAY!`);
    dispatch('monsterData/TRADE_BLOWS', null, {root:true})
  },
  RESET_ANIMATIONS({state,commit}){
    for (let item in state.animations){
      if (state.animations[item] === true) commit('toggleAnimation', {property: item})
    }
  },
}

export default {
    namespaced: true,
    state,
    mutations,
    getters,
    actions,
}
        