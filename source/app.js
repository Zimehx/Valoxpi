/*
    Valoxpi main.js
    BETA 2
*/

//const remote = require('@electron/remote')
//const { ipcRenderer, shell } = require('electron')
//const package = require('../../package.json')
const container = document.getElementById('container')
const API_URL = `https://valorant-api.com/`
const LINK = package.SourceURL
const SRC = LINK + '/source'
const content = document.getElementById('content'); 
const footer = document.getElementById('footer')
var data, players, NameCache = {}, ChatHistory = [], CurrentTab = "players", errors = [], settings = require('./settings.json'),discordIcons=false, CurrentContent = '', CurrentTabID, MatchCache = {}, HistoryCache = {}, PlayerCache = {}, HiddenPlayerCache = {}, LeaderboardCache = {};

if(localStorage.settings) settings = JSON.parse(localStorage.settings);
fetch(`${LINK}/package.json`).then(json => json.json()).then(data => { if(package.version !== data.version) document.getElementById('newversion').innerHTML = "New version available!" })

const openTab = async (tab, id, backId) => {
    if(!data || !window.cosmetics || (CurrentTab == tab && CurrentContent === JSON.stringify(data.players) && !id) || data.data.customPlayers.blocked.includes(data.me)) return;

    CurrentTab = tab
    CurrentTabID = id
    CurrentContent = JSON.stringify(data.players)
    window.recording = false
    const MARGIN_TOP = ['act','wins','games','lvl','rr','name','wr','started', 'lb','wins']

    if(data.connected){
    footer.style.borderTop = `1px solid rgba(143, 143, 143, 0.6)`
    footer.innerHTML = `
    <span class="footerOption" onclick="openTab('settings')">SETTINGS</span>
    <span class="footerOption" onclick="openTab('players')">PLAYERS</span>
    <span class="footerOption" onclick="openTab('game')">GAME</span>
    <span class="footerOption" onclick="openTab('--moreplayers')">MORE PLAYERS</span>`
    } else {
        footer.style.borderTop = ''
        footer.innerHTML = ''
    }


    if(!discordIcons){
        await fetch(`https://discord.com/api/oauth2/applications/${data.data.rpcAppID}/assets`).then(json => json.json()).then(data => { discordIcons = data })
        discordIcons = discordIcons.filter(x=>x.name.startsWith('icon-'))
    }

    switch(tab){
        case '--friends':
        case '--leaderboards':
        case '--moreplayers':
        case '--moreplayerscache':

            document.getElementById('footer').children[3].style.color = 'white'
        var html = `<div style="display:flex;flex-shrink: 0;text-align: center;justify-content: space-evenly;">
        <span id="p1" class="pOption" onclick="openTab('--moreplayers')">LAST PLAYERS</span>
        <span id="p2" class="pOption" onclick="openTab('--friends')">FRIENDS</span>
        <span id="p3" class="pOption" onclick="openTab('--leaderboards')">LEADERBOARD</span>
            </div>        <center> <input onchange="updatePlayerFilter()" placeholder="Search player name" id="playerfilter" style="width:250px;margin-top:15px;" value="${window.playerFilter}"> </center>            `

            content.innerHTML = html
            var playerList = []
            var VALUE_WIDTH = {
                icon:40,
                rank:40,
                name:250,
                wr:40,
                lvl:40,
            }

        switch(tab){
            case '--moreplayers':
            case '--moreplayerscache':
                document.getElementById('p1').classList.add('pOptionActive')
                playerList = Object.values(PlayerCache)
                for(var presence in data.cache.presence){
                    if(!data.cache.presence[presence].isModified) data.cache.presence[presence] = {...data.cache.presence[presence], ...data.cache.rank[presence], agent:data.cache.presence[presence].private && data.cache.presence[presence].private.playerCardId || "None", TeamID:"Spectator", isFromAppCache:true, isModified:true}
                    playerList.filter(x=>x.puuid == presence).length == 0 && data.cache.presence[presence].rank > 2 && playerList.push(data.cache.presence[presence])
                }
            break

            case '--friends':
                document.getElementById('p2').classList.add('pOptionActive')
                VALUE_WIDTH = {name:500}
                playerList = Object.values(data.presence.friends.friends)
                //data.presence.presences.filter(x=>x.Subject == player.puuid)[0]
            //https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/smallart.png
            break
            
            case '--leaderboards':
                document.getElementById('p3').classList.add('pOptionActive')
                VALUE_WIDTH = {
                    lb:80,
                    rank:40,
                    name:250,
                    wins:40,
                    rr:80,
                }

                const leaderboardUrl = '/mmr/v1/leaderboards/affinity/eu/queue/competitive/season/' + data.act + `?startIndex=0&size=${data.data.lbSize}${window.playerFilter !== '' ? `&query=${window.playerFilter.split('#')[0]}` : ''}`
                if(LeaderboardCache[leaderboardUrl])
                    playerList = LeaderboardCache[leaderboardUrl].Players
                 else 
                    LeaderboardCache[leaderboardUrl] = await GET("PD", leaderboardUrl)
                    playerList = LeaderboardCache[leaderboardUrl].Players         
                    if(!playerList) return 
            break
        }

        var VALUES = ""

        for(var value in VALUE_WIDTH){
            VALUES += `<div style="width:${VALUE_WIDTH[value]}px">${value.toUpperCase()}</div>`
        }

        var start = `<div class="playerModel morePlayersModel" style="font-weight:bold;font-size:15px;">${VALUES}</div><div class="moreplayers">`
        var playersContainer = ``
        var onlineContainer = ``

        playerList = playerList.filter(x=>{
            if(tab == '--leaderboards'){
                x.name = x.gameName + '#' + x.tagLine
                x.rr = x.rankedRating
                x.lb = x.leaderboardRank
                x.rank = x.competitiveTier
                x.wins = x.numberOfWins
                return !x.IsAnonymized
            }
            x.name = x.game_name + '#' + x.game_tag; 
            return x.name.toLowerCase().replace(/ /g,'').includes(window.playerFilter.toLowerCase().replace(/ /g,''))// && data.me !== x.puuid
        })

        if(playerList.length == 0) start = '<div class="moreplayers"><h2>No players</h2>'

        playerList.forEach(player => { 
            var NameColor = getNameColor(player)                
            var MODEL = `<div class="playerModel verifiedPlayerModel morePlayersModel" onclick="window.createAndOpenPlayer('${player.puuid}', '${tab == '--moreplayers' && player.isFromAppCache ? '--moreplayerscache' : tab}')" playerid="${player.puuid}" style="background-color:rgba(${data.data.TEAM_COLORS.Spectator}, 0.6);cursor:pointer;${player.glow ? `border: 1px solid ${NameColor};font-weight:bold` : ''}">`

            var online = data.presence.presences.filter(x=>x.Subject == player.puuid)[0]

            if(online && tab == '--friends'){
                MODEL = MODEL.replace(data.data.TEAM_COLORS.Spectator, data.data.TEAM_COLORS.Blue)
                player = {...player, ...online}
            }

            HiddenPlayerCache[player.puuid] = player
            for(var value in VALUE_WIDTH){
                var html = player[value]
                switch(value){
                    case 'wr':
                        if(html == undefined)html = '?'; else 
                        {
                            var loses = player.games-player.wins, wins = player.wins, games = player.games
                            if(settings.ShowActWinrate){
                                html = player.ACTwr
                                loses = player.ACTgames-player.ACTwins
                                wins = player.ACTwins
                                games = player.ACTgames
                            }
                            html = `<span title="Games/Wins/Loses (${games}/${wins}/${loses})">${html}%</span>`
                        }
                    break
                    case 'rank':
                    case 'peak':
                        if(html == undefined)html = 0
                        html = `<img title="${getRankText(html)}" width="32" src="${SRC}/ranks/${html}.png">`
                    break
                    case 'icon':
                        var AgentIcon 
                        html = player.agent
                        if(html.length > 25 && window.cosmetics && window.cosmetics.cards && window.cosmetics.cards.status == 200){
                            var card = window.cosmetics.cards.data.filter(x=>{return x.uuid == html})[0]
                            card && (AgentIcon = card.displayIcon) && (html = card.displayName)
                        } else {
                            if(html.length > 25)
                                AgentIcon = `${SRC}/agents/none.png`
                            else
                                AgentIcon = `${SRC}/agents/${html.toLowerCase().replace('/','')}.png`
                        }
                        html = `<img title="${html}" style="border-radius:3px;" width="32" height="32" src="${AgentIcon}">`
                    break
                    case 'lb':
                        html = '#'+html
                    case 'name':
                        html == "Loading player..." && (NameColor = "#878787")
                        html = `<font color="${NameColor}" class="playerName">${html}</font>`
                }

                MODEL += `<div style="width:${VALUE_WIDTH[value]}px;${MARGIN_TOP.includes(value) ? 'margin-top:8px;':''}">${html}</div>`
            }
            MODEL += '</div>'  
            online && tab == `--friends` ? onlineContainer += MODEL : playersContainer += MODEL
        })
        content.innerHTML += start + onlineContainer + playersContainer

        break
        case 'settings':
            document.getElementById('footer').children[0] && (document.getElementById('footer').children[0].style.color = 'white')
            const SettingsList = {
                "RPC_Enabled":"Enable Status : Enable the discord status",
                "RPC_ShowRank":"Show rank : Show your rank on status whenever the gamemode is competitive",
                "RPC_Icon":"Change main icon : Change icon that is displayed on your status",
                "RPC_AfkMessage":"Change away message : Change the message that will be on your status when you are AFK in VALORANT",
                "RPC_ShowRunTime":"Show full playing time : Show how long you are playing VALORANT for",
                "RPC_ShowMapIcon":"Show map icon when in game : Show map you are playing on as main icon",
                "ToggleKeybind":"Change toggle keybind : Change keybind you use to toggle the app",
                "AutoShowOnGameStart":'Auto open on game start : Auto open the app whenever you get into a game',
                "OpenPlayerListOnToggle":'Open player list on toggle : Whenever you open the app it will automatically open player list',
                "ShowActWinrate":'Show act winrate : Show current act win-rate instead of overall win-rate',
                "AttemptReconnectingWhileHidden":'Reconnect in background : Attempt reconnecting to VALORANT in background while app is hidden',
             }

             var html = `<div class="settings">`
             var colum1 = `<div class="settingColum"> <span class="columTitle">Discord Status Settings</span>`
             var colum2 = `<div class="settingColum"> <span class="columTitle">Valoxpi Settings</span>`
             for(var setting in SettingsList){
                 var text = `<span id="${setting.replace('_','')}" class="option ${settings[setting] ? 'optionActive' : ''}" onclick="changeSetting('${setting}')" title="${SettingsList[setting].split(' : ')[1]}">${SettingsList[setting].split(' : ')[0]}</span>`
                 if(setting.startsWith("RPC_"))colum1 += text;else colum2 += text   
             }
             colum1 += '</div>'; colum2+= '</div>'
             html += colum2 + colum1 + '</div> <div style="display:flex;width:100%;justify-content:center">'
             data.data.links.forEach(link=>{html += `<img src="${SRC}/url-icons/${link[0]}.png" onclick="shell.openExternal('${link[1]}')" width="35" style="cursor:pointer;margin-top:10px;margin-left:20px;margin-right:20px;">`})
             content.innerHTML = html
            break

        case '-RPC_Icon':
             var html = `
             <span class="columTitle">Discord Status Main Icon</span><span>Click to select</span>
             <div style="display:flex;flex-wrap: wrap;height:370px;overflow-y:scroll;">`
             window.updateIcon = (name) => { settings.RPC_Icon = name; updateSettings(); openTab('settings', true) }
             discordIcons.forEach(img => {
                 html+=`<img src="${getDiscordImage(img.name)}" onclick="window.updateIcon('${img.name}')" width="150" style="cursor:pointer;border-radius:15px;margin:15px;${settings.RPC_Icon == img.name ? 'box-shadow: 0px 1px 15px cyan':''}">`
             })

            content.innerHTML = html + `</div><span class="hoverWhite" onclick="openTab('settings')" style="margin-top:10px;font-weight:bold;cursor:pointer;"><< SETTINGS</span>`
        break 
        case '-RPC_AfkMessage':

             window.updateAfkMessage = (msg) => { settings.RPC_AfkMessage = document.getElementById('afkMsg').value; updateSettings() }
             content.innerHTML = `
             <span class="columTitle">Discord Status Away Message</span>
             <span style="font-size:13px;">This message is displayed on your discord status whenever you are away in Valorant</span>
             <center><input id="afkMsg" onchange="window.updateAfkMessage()" style="font-size:30px;margin-top:25px;background:transparent;border:none;border-bottom:1px solid white;width:500px;" maxlength="32" value="${settings.RPC_AfkMessage}"></center>
             <span class="hoverWhite" onclick="openTab('settings')" style="margin-top:50px;font-weight:bold;cursor:pointer;"><< SETTINGS</span>
             `
        break 
        case '-ToggleKeybind':
            window.updateAfkMessage = (msg) => { settings.RPC_AfkMessage = document.getElementById('afkMsg').value; updateSettings() }
            content.innerHTML = `
            <span class="columTitle">App Toggle Keybind</span>
            <span style="font-size:13px;">Click on the current keybind and when its red press new combination</span>
            <center>
             <div id="keybind" onclick="window.startRecording()">${settings.ToggleKeybind}</div>
            </center>
            <span class="hoverWhite" onclick="openTab('settings')" style="margin-top:50px;font-weight:bold;cursor:pointer;"><< SETTINGS</span>
            `
        break
        case '-matchPerformance':
        case '-matchScoreboard':
        case '-match':
             var match = MatchCache[id]
             var mainHtml = ''
             if(!match)return

             switch(tab){
                 case '-match':

                    var statsHtml = ``
                    var stats = {
                       "KDR":(match.stats.kills/match.stats.deaths).toFixed(1), 
                       "SCOREBOARD PLACEMENT": '#'+match.pos, //`${match.pos}${(match.pos == 1 ? 'st' : match.pos == 2 ? 'nd' : match.pos == 3 ? 'rd' : 'th')}`,
                       "COMBAT SCORE":match.stats.score,
                       "AVERAGE COMBAT SCORE": match.stats.acs,
                       "DAMAGE PER ROUND":match.dpr.toFixed(0),
                       "KILL/ PER ROUND":`${match.kpr}`.replace('.0',''),
                       "FIRST BLOOD/":match.fb,
                    }
       
                    for(var stat in stats){
                       if(stats[stat] != 0)statsHtml += `<span style="padding-top:5px;"><b style="color:white;font-family:Arial">${stats[stat]}</b> ${stats[stat] == 1 ? stat.replace('/','') : stat.replace('/','S')}</span><br>`
                    }
       
                    statsHtml+=`
                    <br><br><div style="display:flex;">
                    <div class="rates">
                    <div style="color:gray"> ${match.hs}</div>
                    <div style="color:gray"> ${match.bs}</div>
                    <div style="color:gray"> ${match.ls}</div>
                    </div>
       
                       <div>
                           <div title="Headshot rate" style="width:20px;height:20px;background-color:gray;border-radius:50%;"></div>
                           <div title="Bodyshot rate" style="width:20px;height:30px;background-color:gray;border-radius:5px;margin-top:2px;"></div>
                           <div title="Legshot rate" style="display:flex;margin-top:2px;"> <div style="width:9px;height:30px;background-color:gray;border-radius:3px;margin-right:2px;"></div> <div style="width:9px;height:30px;background-color:gray;border-radius:3px;"></div> </div>
                       </div>
       
                       <div class="rates" style="margin-right:20px;">
                       <div> ${match.hsr}%</div>
                       <div> ${match.bsr}%</div>
                       <div> ${match.lsr}%</div>
                       </div>
       
                    `
       
                    for(var k=2; k<=6; k++){
                        if(match[k+'k'])
                        statsHtml +=  
                        `<div title="${k} KILLS" style="text-align:center;color:white;padding-left:10px;"><img style="border-radius:50%;" src="${SRC}/icons/${k}k.png" width="50"><br><b>${match[k+'k']}</b></div>`
                    }
       
                    statsHtml+='</div>'
                    var name = `${match.player.gameName}#${match.player.tagLine}`

                    mainHtml = `
                    <div style="display:flex">
                    <div style="text-align:left;padding:20px;width:60%;">
                    ${statsHtml}
                    </div>
    
                    <div>
                    <div class="bgImg" style="background-image:url('${SRC}/maps/${match.map}.png');">
                        <span>${match.map}</span><br>
                        <span style="font-size:16px;">${timeSince(new Date(match.matchInfo.gameStartMillis))}</span>
                    </div>
    
                    <div style="display:flex;margin-bottom:10px;">
                    <img style="border-radius:10px;" width="60" title="$--{match.agent}" height="60" src="${SRC}/agents/${match.agent.toLowerCase().replace('/','')}.png">
                    <div style="padding:10px;text-align:center;"><span title="${name}" onclick="window.copy('${name}')" style="color:white;font-weight:bold">${match.player.gameName}</span><br>${match.stats.kills} / ${match.stats.deaths} / ${match.stats.assists}</div>
                    </div>
                    ${match.mvp > 0 ? `${match.mvp == 1 ? '<b style="color:white">TEAM MVP</b>' : '<b style="color:gold">MATCH MVP</b>'}<br>` : ''}

                    <div><img width="60" src="${SRC}/ranks/${match.updates.TierAfterUpdate}.png" style="margin-top:${match.mvp > 0 ? 10 : 0}px;"></div>
                   ${isNaN(match.updates.RankedRatingEarned) ? '' : `<div style="margin-top:5px;font-size:13px;color:${match.updates.RankedRatingEarned > 0 ? '#82ff86' : '#ff5c5c'};">${match.updates.RankedRatingEarned > 0 ? '+' : ''}${match.updates.RankedRatingEarned} RR</div>`}
                    <div style="margin-top:10px;"><b style="color:white;font-size:20px;font-family:Arial;">${getRankText(match.updates.TierAfterUpdate).toUpperCase()}</b></div>
                    <div style="font-size:13px;margin-bottom:20px;"><span style="color:#82ff86;">${match.updates.RankedRatingAfterUpdate}${match.updates.TierAfterUpdate > 20 ? ' RR</span>' : '</span><span style="color:#ababab;">/100</span>'}</div>

                    </div>
                 </div>
                    `
                 break 

                 case '-matchScoreboard':
                    match.players.forEach((player, i)=>{
                        console.log(player)

                        if(!player.pos)player.pos = i+1
                        player.fbs = Object.values(match.roundFB).filter(x=>x == player.subject).length

                        mainHtml+=
                        `
                            <div>
                            <div class="playerModel verifiedPlayerModel" onclick="openTab('-player', '${player.subject}', 'players')" style="background-color:rgba(${data.data.TEAM_COLORS[player.teamId]}, 0.6);cursor:pointer;">
                                <div style="width:100px;"><img src="${SRC}/agents/${data.agents[player.characterId].toLowerCase().replace('/','')}.png" height="35"></div>
                                <div style="width:100px;"><img src="${SRC}/ranks/${player.competitiveTier}.png" height="35"></div>
                                <div style="width:300px;margin-top:8px;">${player.gameName}#${player.tagLine}</div>
                                <div style="width:80px;margin-top:8px;">${(player.stats.score/match.roundResults.length).toFixed(0)}</div>
                                <div style="width:150px;margin-top:8px;">${player.stats.kills} / ${player.stats.deaths} / ${player.stats.assists}</div>
                                <div style="width:80px;margin-top:8px;">${player.fbs}</div>

                            </div>
                            </div>
                        `
                    })

                 break
             }

             var side1 = `

                <div style="width:100%;margin-top:15px;margin-bottom:20px;text-shadow: #000 0 0 8px;font-size:28px;font-weight:bold;text-align:center;color:${match.score[0] == match.score[1] ? data.data.TEAM_TEXTS["Spectator"].split(":")[1] : match.win ? data.data.TEAM_TEXTS["Blue"].split(":")[1] : data.data.TEAM_TEXTS["Red"].split(":")[1]}">
                    ${match.score[0] == match.score[1] ? 'DRAW' : match.win ? 'VICTORY' : 'DEFEAT'} <br>
                    <span style="font-size:18px;">${match.score[0]} - ${match.score[1]}</span>
                </div>

                ${mainHtml}

             <div style="text-align:left;display:flex;justify-content:space-around;margin-top:10px;">
             <b class="hoverWhite" onclick="openTab('-playerMatches', '${backId}', 'players')" style="cursor:pointer;"><< MATCH HISTORY </b>
             <b class="hoverWhite" onclick="openTab('-match', '${id}', '${backId}')" style="cursor:pointer;${tab == '-match' ? 'color:white' : ''}">STATS</b>
             <b class="hoverWhite" onclick="openTab('-matchScoreboard', '${id}', '${backId}')" style="cursor:pointer;${tab == '-matchScoreboard' ? 'color:white' : ''}">SCOREBOARD</b>
             <b class="hoverWhite" onclick="openTab('-matchPerformance', '${id}', '${backId}')" style="cursor:pointer;${tab == '-matchPerformance' ? 'color:white' : ''}">PERFORMANCE</b>
                </div>
             `
             /*                 
             <img title="${getRankText(match.updates.TierAfterUpdate)}" src="${SRC}/ranks/${match.updates.TierAfterUpdate}.png" width="80"> 
                 ${match.updates.TierAfterUpdate != 0 && match.updates.TierAfterUpdate <= 20 ? `<div style="height:4px;color:white;font-size:13px;width:80%;background:#404040;margin-left:10%;border-radius:3px;margin-top:10px;">
                    <div id="bar" style="width:${match.updates.RankedRatingAfterUpdate}%;background:#55e645"><br></div>
                </div>               
                ` : ''}<br>  
                <span style="color:${match.updates.RankedRatingEarned > -1 ? "#61ff89" : "#ff6161"};font-weight:bold">${match.updates.RankedRatingEarned > 0 ? '+' :''}${match.updates.RankedRatingEarned} RR</span>
            */


             var html = side1
             content.innerHTML = html
        break 
        case 'players':
            if(data.connected){
                if(data.players){
                    document.getElementById('footer').children[1].style.color = 'white'

                    var VALUES = ""
                    const VALUE_WIDTH = {
                        party:50,
                        agent:50,
                        rank:40,
                        peak:40,
                        name:250,
                        wr:40,
                        lvl:40,
                        rr:40,
                        lb:60
                    }

                    for(var value in VALUE_WIDTH){
                        VALUES += `<div style="width:${VALUE_WIDTH[value]}px">${value.toUpperCase()}</div>`
                    }
    
                    const TOP = `<div class="playerModel" style="font-weight:bold;font-size:15px;">${VALUES}</div>`
                    var createdPlayers = []
                    content.innerHTML = TOP

                    var needName = players.filter(player => { return player.name == 'Loading player...' })
                    if(needName.length > 0 && needName.filter(x=>!NameCache[x.Subject]).length)await window.findName(needName)

                    players.forEach(player => { 

                        PlayerCache[player.Subject] = player
                        if(createdPlayers.includes(player.Subject)) return;
                        createdPlayers.push(player.Subject)
                        var NameColor = getNameColor(player)
                        var MODEL = `<div class="playerModel verifiedPlayerModel" onclick="openTab('-player', '${player.Subject}', 'players')" playerid="${player.Subject}" style="background-color:rgba(${data.data.TEAM_COLORS[player.TeamID]}, 0.6);cursor:pointer;${player.glow ? `border: 1px solid ${NameColor};font-weight:bold` : ''}">`
                        const PARTY = `<svg width="26" height="26" style="margin-top:4px;" preserveAspectRatio="xMidYMid meet" viewBox="0 0 16 16"><g ${player.party ? `` : 'fill-opacity="0.0"'} fill="${player.party}"><path d="M3 14s-1 0-1-1s1-4 6-4s6 3 6 4s-1 1-1 1H3zm5-6a3 3 0 1 0 0-6a3 3 0 0 0 0 6z"/></g></svg>`
 
                        for(var value in VALUE_WIDTH){
                            var html = player[value]
                            switch(value){
                                case 'wr':
                                    var loses = player.games-player.wins, wins = player.wins, games = player.games
                                    if(settings.ShowActWinrate) html = player.ACTwr, loses = player.ACTgames-player.ACTwins, wins = player.ACTwins, games = player.ACTgames;
                                    html = html == '?' ? '?' : `<span title="Games/Wins/Loses - ${games}/${wins}/${loses}">${html}%</span>`
                                break
                                case 'rank':
                                case 'peak':
                                    html = `<img title="${getRankText(html)}" width="32" src="${SRC}/ranks/${html}.png">`
                                break
                                case 'agent':
                                    var AgentIcon, isNotLocked = player.CharacterSelectionState !== 'locked' && data.GameState == 'PREGAME' && html !== 'None'
                                    //i have no idea what type of check is that lol (checking it after few months of coding)
                                    if(html.length > 25 && window.cosmetics && window.cosmetics.cards && window.cosmetics.cards.status == 200){
                                        var card = window.cosmetics.cards.data.filter(x=>{return x.uuid == html})[0]
                                        card && (AgentIcon = card.displayIcon) && (html = card.displayName)
                                        content.innerHTML.includes("AGENT") && (content.innerHTML = content.innerHTML.replace("AGENT", "CARD"))
                                    } else {
                                        if(html.length > 25)
                                            AgentIcon = `${SRC}/agents/none.png`
                                        else
                                            AgentIcon = `${SRC}/agents/${html.toLowerCase().replace('/','')/* kay/o moment */}.png`
                                    }
                                    html = `<img title="${html} ${isNotLocked ? '(Not Locked)' : ''}" style="border-radius:3px;${isNotLocked ? 'filter: grayscale(100%);' : ''}" width="32" height="32" src="${AgentIcon}">`
                                break
                                case 'lb':
                                    html = html == 0 ? 'None' : '#' + html;
                                break
                                case 'party':
                                    html = PARTY
                                break
                                case 'name':
                                    html == "Loading player..." && (NameColor = "#878787") && (html = NameCache[player.Subject])
                                    html = `<font color="${NameColor}" class="playerName">${html}</font>`
                            }

                            MODEL += `<div style="width:${VALUE_WIDTH[value]}px;${MARGIN_TOP.includes(value) ? 'margin-top:8px;':''}">${html}</div>`
                        }
                        MODEL += '</div>'  
                        content.innerHTML += MODEL
                    })
                    
                } else {
                    if(data.match.httpStatus == 400) ipcRenderer.send("refreshHeaders")  
                        else  
                    content.innerHTML = `<h2 class="loading" title="If the screen is stuck you have to restart your game">Loading players</h2>` 
                }
            } else {
                content.innerHTML = "<h2>Valorant is not open</h2>"
            }
        break
        case '-aimlab':
            if(!id || id == 1)window.aimlabPoints = 0; else window.aimlabPoints++
            if(!localStorage.aimlabBest)localStorage.aimlabBest = 0
            var html = `<div style="height:500px;width:100%" onclick="openTab('-aimlab', 1)">Best: ${localStorage.aimlabBest}
                <div style="border-radius:50%;width:40px; height:40px;color:black;font-weight:bold;font-size:20px;cursor:pointer;background-color:red;margin-left:${Math.random() * 650}px;margin-top:${Math.random() * 450}px;" onmousedown="openTab('-aimlab', 2)">${window.aimlabPoints}</div>
            </div>`
            if(window.aimlabPoints > localStorage.aimlabBest)localStorage.aimlabBest = window.aimlabPoints
            content.innerHTML = html
        break 
        case '-playerAcs':
        case '-playerInventory':
        case '-playerMatches':
        case '-player':
            var player = players.filter(x=>{return x.Subject == id})[0]
            if(!player)player = PlayerCache[id] || HiddenPlayerCache[id]
            if(!player || !id || !window.cosmetics)return

            var card = window.cosmetics.cards.data.filter(x=>{return player.private && x.uuid == player.private.playerCardId})[0],
            title = window.cosmetics.titles.data.filter(x=>{return player.private && x.uuid == player.private.playerTitleId})[0],
            nameColor = getNameColor(player), sh = `'${id}', '${backId}'`;
            if(!card || player.isHidden){card = {largeArt:'https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/largeart.png'}; title=undefined}
            content.innerHTML = `
                <div style="display:flex;">
                     <div style="height:500px;width:200px;border-radius:5px;background-image:url('${card.largeArt}');background-size: 70% 70%;background-position: center;background-repeat: no-repeat;background-size: cover;font-size:13px;">
                     <div style="height:470px;">
                     <div id="name" title="Click to copy" onclick="window.copy('${player.name}')" style="cursor:pointer;background-color:rgba(0,0,0,0.8);color:${nameColor};padding:5px;margin-top:300px;">${player.name == "Loading player..." ? NameCache[player.Subject] || 'Unknown Player' : player.name}</div>
                     ${title && title.titleText !== null ? `<div style="background-color:rgba(0,0,0,0.8);padding:2px;margin-top:5px;font-size:10px;">${title.titleText}</div>` : ''}
                     <div style="${player.isFromHiddenCache || data.GameState == "MENUS" ? 'color:transparent;' : `color:${data.data.TEAM_TEXTS[player.TeamID].split(":")[1]};text-shadow: #000 0 0 8px;`}font-size:18px;margin-top:23px;font-weight:bold;">${data.data.TEAM_TEXTS[player.TeamID].split(":")[0]}</div>
                     ${data.GameState !== "MENUS" && !player.isFromHiddenCache ? `
                        <img src="${SRC}/agents/${player.agent.toLowerCase().replace('/','')}.png" width="50" style="margin-top:10px;border-radius:10px;" title="${player.agent}">
                     ` : ''}
                     </div>

                     <div onclick="openTab('${backId}')" style="background-color:rgba(0,0,0,0.7);cursor:pointer;text-shadow: #000 0 0 9px;font-size:15px;font-weight:bold;padding:5px;" class="hoverWhite"><< PLAYERS </div>
                     
                     </div>

                     <div style="display:flex;flex-direction: column;width:500px;margin-left:20px;">
                        <div style="display:flex;flex-shrink: 0;text-align: center;justify-content: space-between;">
                            <span id="p1" class="pOption" onclick="openTab('-player', ${sh})">STATS</span>
                            <span id="p2" class="pOption" onclick="openTab('-playerMatches', ${sh})">MATCH HISTORY</span>
                            <span id="p3" class="pOption" onclick="openTab('-playerAcs', ${sh})">ACTS</span>
                            <span id="p4" class="pOption" onclick="openTab('-playerInventory', ${sh})">INVENTORY</span>
                        </div>
                        <div id="playerContent" style="margin-top:15px;overflow-y:scroll;height:440px;"></div>
                     </div>
                </div>
            `

            switch(tab){
                case '-playerInventory':
                    document.getElementById('p4').classList.add('pOptionActive')

                    if(player.isHidden)return document.getElementById('playerContent').innerHTML = '<h2>Inventory Hidden</h2>'
                    if(!player.skins && data.cache.skins[player.Subject])player.skins = data.cache.skins[player.Subject]
                    if(!player.skins || !player.skins.Loadout || !window.cosmetics) return document.getElementById('playerContent').innerHTML = '<h4>You have to be in game to view inventories</h4>'
                    var skins = {}
                    var weapons = player.skins.Loadout.Items
                    var sprays = player.skins.Loadout.Sprays.SpraySelections

                    if(weapons){
                        for(var weapon in weapons){
                            var skin = {weapon}
                            var fullWeapon = window.cosmetics.weapons.data.filter(x=>x.uuid == weapon)[0]
                            var sockets = weapons[weapon].Sockets

                            skin.skinId = sockets[data.data.socketIds.weaponSkin].Item.ID
                            skin.variantId = sockets[data.data.socketIds.variant].Item.ID
                            skin.buddyId = sockets[data.data.socketIds.buddy]
                            if(skin.buddyId){skin.buddyId = skin.buddyId.Item.ID;skin.buddy=window.cosmetics.buddies.data.filter(x=>x.uuid == skin.buddyId)[0]}
                            skin.skin = fullWeapon.skins.filter(x=>x.uuid == skin.skinId)[0]
                            skin.weapon = fullWeapon

                            if(skin.skin){
                                if(skin.skin.chromas.length > 1){
                                    skin.variant = skin.skin.chromas.filter(x=>x.uuid == skin.variantId)[0]
                                } else {
                                    skin.variant = skin.skin.chromas[0]
                                }
                            } else {
                                skin.variant = {fullRender:skin.weapon.displayIcon}
                            }

                            skins[skin.weapon.displayName] = skin
                        }

                        var html = `<div style="display:flex"><div class="skinColumn skinsLeft" style="width:170px;">`
                        const colum1 = ['Melee','Classic','Shorty','Frenzy','Ghost','Sheriff','spray1','spray2','spray0']
                        const colum2 = ['Vandal','Phantom','Guardian','Bulldog','Operator','Marshal','Spectre','Stinger','Judge','Bucky','Odin','Ares']
                        const spray_id = ["POST-ROUND", "PRE-ROUND", "MID-ROUND"]
                        const fnc = weapon => { html+=`<div id="${weapon}"></div>` }
                        colum1.forEach(fnc)
                        html += `</div><div class="skinColumn skinsRight" style="width:300px;">`
                        colum2.forEach(fnc)
                        html += `</div></div>`
                        document.getElementById('playerContent').innerHTML = html

                        for(var i =0; i< sprays.length; i++){
                            var spray = window.cosmetics.sprays.data.filter(x=>x.uuid == sprays[i].SprayID)[0]
                            var icon = spray.fullTransparentIcon || spray.displayIcon
                            document.getElementById('spray'+i).innerHTML = `<img title="[${spray_id[i]}] ${spray.displayName}" src="${icon}">`
                        }

                        for(var weapon in skins){
                            var img = document.getElementById(weapon)
                            if(img){
                                img.innerHTML =  `<img title="${skins[weapon].skin.displayName}" src="${skins[weapon].variant.fullRender}" style="position: relative;">`
                                if(skins[weapon].buddy){
                                    img.innerHTML+=`<img style="position:absolute;bottom:5;left:0;width:40px;" src="${skins[weapon].buddy.displayIcon}" title="${skins[weapon].buddy.displayName}">`
                                }
                            }
                        }
                    }

                break
                case '-playerAcs':
                    document.getElementById('p3').classList.add('pOptionActive')


                    var VALUES = ""
                    if(!player.QueueSkills || !player.QueueSkills.competitive)return document.getElementById('playerContent').innerHTML = '<h2>No acts</h2>'
                    var seasons = player.QueueSkills.competitive.SeasonalInfoBySeasonID
                    const VALUE_WIDTH = {
                        rank:40,
                        act:100,
                        games:50,
                        wr:30,
                        started:140,
                        lb:70
                    }

                    for(var value in VALUE_WIDTH){
                        VALUES += `<div style="width:${VALUE_WIDTH[value]}px">${value.toUpperCase()}</div>`
                    }
    
                    const TOP = `<div class="playerModel" style="font-weight:bold;font-size:15px;">${VALUES.replace(/_/g, ' ')}</div>`
                    document.getElementById('playerContent').innerHTML = TOP
                    var Seasons = Object.values(window.seasons)
                    Seasons.reverse()
                    Seasons.forEach(SeasonAPI => { 
                        var season = seasons[SeasonAPI.ID]
                        if(!season)return;

                        var MODEL = `<div class="playerModel">`
                        for(var value in VALUE_WIDTH){
                            var rank = season.WinsByTier ? Object.keys(season.WinsByTier) : [0,0,0]
                            rank = rank[rank.length-1]
                            var X = {
                                rank:`<img width="40" src="${SRC}/ranks/${rank}.png" title="${getRankText(rank)}">`,
                                act:SeasonAPI.episode.Name.replace("EPISODE","EP") + ' ' + SeasonAPI.Name,
                                games:`<span title="W/L (${season.NumberOfWinsWithPlacements}/${season.NumberOfGames-season.NumberOfWinsWithPlacements})">${season.NumberOfGames}</span>`,
                                wr:((season.NumberOfWinsWithPlacements/season.NumberOfGames)*100).toFixed(0) + '%',
                                started:`<span title="${new Date(SeasonAPI.StartTime).toDateString().split(" ").slice(1).join(" ")}">${timeSince(new Date(SeasonAPI.StartTime))}</span>`,
                                lb:'#'+season.LeaderboardRank
                            }
                            var html = X[value]
                            MODEL += `<div style="width:${VALUE_WIDTH[value]}px;${MARGIN_TOP.includes(value) ? 'margin-top:10px;':''}">${html}</div>`
                        }
                        MODEL += '</div>'  
                        document.getElementById('playerContent').innerHTML += MODEL
                    })

                break
                case '-playerMatches':
                    if(!player)return

                    document.getElementById('p2').classList.add('pOptionActive')
                    document.getElementById('playerContent').innerHTML = `<h2 class="loading">Loading</h2>`

                    window.getPlayerHistory(player.Subject, (Games) => {
                        if(CurrentTab !== tab)return
                        document.getElementById('playerContent').innerHTML = ''
                        var matchIndex = 0
                        document.getElementById('p2').classList.add('pOptionActive')
                        if(Games.Matches.length == 0) return document.getElementById('playerContent').innerHTML = "<h2>No matches</h2>"
                        Games.Matches.forEach(game=>{
                            var color = game.win ? 'Blue' : 'Red'
                            var updates = Games.RankUpdates.Matches[matchIndex]
                            if(!updates)updates = { TierAfterUpdate:0,RankedRatingEarned:'?', RankedRatingAfterUpdate:'?' }
                            if(game.score[0] == game.score[1])color = "Spectator"
                            game.updates = updates
                            var MODEL = `<div class="playerModel" onclick="openTab('-match','${game.vid}', '${player.Subject}')" style="cursor:pointer;background-color:rgba(${data.data.TEAM_COLORS[color]}, 0.5); background: linear-gradient(90deg, ${game.bf ? `rgba(88,88,88,1)` : game.mvp > 0 ? game.mvp == 1 ? 'rgba(241,241,241,1)' : 'rgba(254,190,70,1)' : `rgba(${data.data.TEAM_COLORS[color]}, 0.5)`} 0%, rgba(${data.data.TEAM_COLORS[color]}, 0.5) 19%);  height:70px;padding:5px;margin-bottom:5px;">
                                    <img width="70" height="70" style="border-radius:5px;border-radius:5px;padding:2px;" title="[#${game.pos}] ${game.agent} ${game.bf ? ` - ${game.pos == 10 ? 'MATCH' : 'TEAM'} BOTTOM` : game.mvp > 0 ? (game.mvp == 1 ? ` - TEAM MVP` : '- MATCH MVP') : ''}" src="${SRC}/agents/${game.agent.toLowerCase().replace('/','')}.png">
                                    <div style="margin-top:5px;font-weight:bold;width:160px;text-align:center;">
                                        <div class="playerModel">
                                            <div style="font-size:20px;width:100%;" title="${game.win ? 'Win' : game.score[0] == game.score[1] ? 'Draw' : 'Lost'} (${timeSince(new Date(game.matchInfo.gameStartMillis))})">${game.score[0]} - ${game.score[1]}</div>
                                        </div>
                                        <div class="playerModel" style="text-align:center;">
                                            <div style="width:100%;" title="${(game.stats.kills/game.stats.deaths).toFixed(1)} KD / ${game.kpr} KPR / ${game.fb} FB">${game.stats.kills} / ${game.stats.deaths} / ${game.stats.assists}</div>
                                        </div>
                                    </div>
                                    <div style="margin-top:5px;width:100px;">
                                        <div class="playerModel">
                                            <div title="Headshot rate">HSR ${game.hsr}%</div>
                                        </div>
                                        <div class="playerModel">
                                            <div title="${game.stats.score} score / ${game.dpr.toFixed(0)} DPR">ACS ${game.stats.acs}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="playerModel" style="margin:0;padding:0;width:100px;">
                                        <img height="80" src="${SRC}/ranks/${updates.TierAfterUpdate}.png" title="${getRankText(updates.TierAfterUpdate)}"><br>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="playerModel" style="margin-top:10px;width:50px;font-weight:bold;">
                                        <span title="Total: ${updates.RankedRatingAfterUpdate} RR" style="text-align:center;color:${updates.RankedRatingEarned > -1 ? "#61ff89" : updates.RankedRatingEarned == '?' ? '#727e9e' : "#ff6161"};">
                                        ${updates.RankedRatingEarned > 0 ? '+' : ''}${updates.RankedRatingEarned}
                                        ${updates.TierAfterUpdate !== 0 && updates.TierAfterUpdate !== updates.TierBeforeUpdate ? `<br><span style="font-size:30px;" title="${updates.TierAfterUpdate > updates.TierBeforeUpdate ? 'UPRANK' : 'DERANK'}: ${getRankText(updates.TierBeforeUpdate)} >> ${getRankText(updates.TierAfterUpdate)}">${updates.TierAfterUpdate > updates.TierBeforeUpdate ? String.fromCharCode(11165) : String.fromCharCode(11167)}</span>` : ''}
                                        </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="playerModel" style="width:130px;margin:0;padding:0">
                                            <img width="130" src="${SRC}/maps/${game.map}.png" title="${game.map} (${timeSince(new Date(game.matchInfo.gameStartMillis))})">
                                        </div>
                                    </div>
                                </div>`
                            
                            document.getElementById('playerContent').innerHTML += MODEL
                            matchIndex++
                        })
                    })

                break
                case '-player':
                    document.getElementById('p1').classList.add('pOptionActive')
                    document.getElementById('playerContent').innerHTML = `<h2 class="loading">Loading</h2>`

                    window.getPlayerHistory(player.Subject, (Games) => {
                        if(CurrentTab !== tab)return
                        document.getElementById('p1').classList.add('pOptionActive')

                        if(player.wins == 'NaN' || Games.Matches.length == 0)
                        return document.getElementById('playerContent').innerHTML = "<h2>No competitive stats</h2>"

                        var currentAct = ` <span title="Current Act" style="color:#949494">`
                        var stats = {
                            "Level":player.lvl,
                            'Average KDR : Average kill/death ratio':Games.kd,
                            'Average ACS : Average avg combat score':Games.avgacs,
                            'Average KPG : Average kills per game':Games.avgk,
                            'Average FBS : Average first bloods':Games.avgfb,
                            'Average DPR : Average damage per round':Games.dpr,
                            "Headshot rate":Games.hsr + "%",
                            "Rank":`<img style="vertical-align:bottom;" src="${SRC}/ranks/${player.rank}.png" width="25"> `+getRankText(player.rank),
                            "Peak":`<img style="vertical-align:bottom;" src="${SRC}/ranks/${player.peak}.png" width="25"> `+getRankText(player.peak),
                            "Main":`<img style="vertical-align:bottom;" src="${SRC}/agents/${Games.FavAgent[0].toLowerCase().replace('/','')}.png" width="25"> ` + Games.FavAgent[0],
                            'Player score : Average scoreboard placement':(Games.MVPscore.toFixed(1)).replace('.0','') + '/10',
                            "Ranked rating":`${player.rr}${player.rank < 21 ? '/100' : ''}`,
                            'Leaderboard : Immortal +':'#'+player.lb,
                            "Winstreak":`${Games.ws == Games.Matches.length || Games.ws == -(Games.Matches.length) ? 'More than ' : ''}${Games.ws}`,
                            "Winrate":player.wr + "%" + `${currentAct}(${player.ACTwr}%)</span>`,
                            "Games played":player.games + `${currentAct}(${player.ACTgames})</span>`,
                            "Games won":player.wins + `${currentAct}(${player.ACTwins})</span>`,
                            "Games lost":player.games-player.wins + `${currentAct}(${player.ACTgames-player.ACTwins})</span>`
                        }

                        var colum1='',colum2='',index=0

                        for(var stat in stats){
                            var text = `<span ${stat.split(' : ')[1] ? `title="${stat.split(' : ')[1]}"` : ''}><b>${stat.split(' : ')[0]}:</b><span style="font-family:Arial"> ${stats[stat]}</span></span><br>${index == 8 ? '' : `<br>`}`
                            if(index >= 9)colum2+=text; else colum1+=text
                            index++
                        }

                        document.getElementById('playerContent').innerHTML = `
                        <div style="display:flex"><div style="text-align:left;">${colum1}</div><div style="text-align:left;margin-left:35px;">${colum2}</div></div>
                        <center><canvas id="char" style="max-width:400px;max-height:180px;"></canvas></center>
                        `
                        new Chart("char", {
                            type: "line",
                            data: {
                              labels: Games.xdata,
                              datasets: [{
                                fill: false,
                                pointRadius: 0,
                                borderColor: "#9fff75",
                                data: Games.rrData
                              }]
                            },    
                            options: {
                              legend: {display: false},
                              title: {
                                display: true,
                                text: "Ranked Rating Progress",
                                fontSize: 16
                              }
                            }
                          });
                     })
                break
            }

        break
    }
/*
    for(var i=0;i<document.querySelectorAll('*[title]').length; i++){
        var node = document.querySelectorAll('*[title]')[i]
        if(node.attributes.title.value !== ''){

        }
        node.attributes.title.value = ''
    }
 */
    //loading images sucks
    var height = tab == 'settings' && document.getElementsByTagName('img')[0].offsetHeight < 30 ? container.offsetHeight+30 : container.offsetHeight
    ipcRenderer.send("updateSize", height)
}
window.findName = async (players) => {
    var puuids = []
    players.forEach(player => { puuids.push(player.Subject) })
    function next(json){ json.forEach(name => { NameCache[name.Subject] = name.GameName + '#' + name.TagLine }) }
    await fetch(data.API.PD + '/name-service/v2/players', {method:'PUT', headers:data.headers.public, body:JSON.stringify(puuids)}).then(x=>x.json()).then(next)
}
ipcRenderer.on("update", (event, arg)=>{ data = JSON.parse(arg); getSeasons(); document.getElementById('own').innerHTML = data.data.own; players = data.players; if(!window.cosmetics)getCosmetics(); else if(!CurrentTab.startsWith('-'))openTab(CurrentTab, CurrentTabID); })
function changeSetting(setting) {
    if(settings[setting] !== false && settings[setting] !== true)
    return openTab('-'+setting);

    settings[setting] = !settings[setting]
    openTab('settings', 69)
    updateSettings()
}
window.playerFilter = ''
var update = () => { ipcRenderer.send("update") }
const updateSettings = () => { localStorage.settings = JSON.stringify(settings); ipcRenderer.send("settings", JSON.stringify(settings)) }
//const exit = () => { remote.app.exit() }
//const hide = () => { ipcRenderer.send('hide') }
const getNameColor = (player) => {return player.color ? player.color : player.isMe ? '#ffc44f' : '#bcc0cf'}
const getDiscordImage = (ImgName) => { var Img = discordIcons.filter(x=>x.name === ImgName)[0]; return `https://cdn.discordapp.com/app-assets/${data.data.rpcAppID}/${Img.id}.png?size=256` }
const getCosmetics = async () => { 
    var cosmetics = {API_URL}
    cosmetics.weapons = await GET("VAL-API", "+/weapons")
    cosmetics.cards = await GET("VAL-API", "+/playercards")
    cosmetics.sprays = await GET("VAL-API", "+/sprays")
    cosmetics.titles = await GET("VAL-API", "+/playertitles")
    cosmetics.buddies = await GET("VAL-API", "+/buddies")
    window.valorant_strings = await GET("VAL-API", "internal/locres/en-US")
    window.cosmetics = cosmetics
    openTab(CurrentTab, CurrentTabID);
    getSeasons()
}

const GET = async (API, PATCH) => {
    try{
        var DATA = null;
        if(API == "VAL-API"){ await fetch(API_URL + PATCH.replace("+", data.data.apiVersion[1])).then(json=>json.json()).then(json=>DATA=json); return DATA }
        await fetch(data.API[API] + PATCH, {headers: API == 'LOCAL' ? data.headers.local : data.headers.public}).then(json=>json.json()).then(json=>DATA=json)    
        if(DATA.httpStatus == 400){ ipcRenderer.send("refreshHeaders"); return {error:400} }
        return DATA
    } catch (error) {
        return {error}
    }
}

function updatePlayerFilter(){ window.playerFilter = document.getElementById('playerfilter').value; openTab(CurrentTab, true)}

function getSeasons(){
    if(!data.seasons)return
    var episodes = data.seasons.filter(x=>x.Type==="episode")
    var epIndex = 1
    var nextEp = 0
    var acts = data.seasons.filter(x=>x.Type==="act")
    var seasons = {}

    for(var i=0; i<acts.length; i++){
        acts[i].episode = episodes[epIndex]
        seasons[acts[i].ID] = acts[i]
        nextEp++
        if(nextEp === 3){epIndex++; nextEp = 0}
    }

    window.seasons = seasons
}
// https://www.30secondsofcode.org/articles/s/copy-text-to-clipboard-with-javascript
window.copy = str => { const el=document.createElement("textarea");el.value=str,document.body.appendChild(el),el.select(),document.execCommand("copy"),document.body.removeChild(el); };
// https://stackoverflow.com/a/3177838
function timeSince(o){var t=Math.floor((new Date-o)/1e3),r=t/31536e3;return (r>1?Math.floor(r)+`${Math.floor(r) == 1 ? ' year' : ' years'}`:(r=t/2592e3)>1?Math.floor(r)+`${Math.floor(r) == 1 ? ' month' : ' months'}`:(r=t/86400)>1?Math.floor(r)+`${Math.floor(r) == 1 ? ' day' : ' days'}`:(r=t/3600)>1?Math.floor(r)+`${Math.floor(r) == 1 ? ' hour' : ' hours'}`:(r=t/60)>1?Math.floor(r)+`${Math.floor(r) == 1 ? ' minute' : ' minutes'}`:Math.floor(t)+" seconds") + " ago"}
window.onload = () => { delete window.cosmetics; updateSettings(); openTab(CurrentTab, CurrentTabID); }
setInterval(()=>{ HistoryCache = {}; discordIcons = undefined; LeaderboardCache = {} }, 1000*60*10)
function getRankText(id){return data.data.ranks[id]}
window.getRank = async(UID, callback) => {
    await remote.getGlobal('VAL').getRank(UID).then(data=>{callback(data)})
}
window.createAndOpenPlayer = async (puuid,tab) => {
    if(tab == '--moreplayers')return openTab('-player', puuid, tab)

    var player = HiddenPlayerCache[puuid]
    await window.getRank(puuid, (rank)=>{
        switch(tab){
            case '--leaderboards':
            HiddenPlayerCache[puuid] = {
                Subject:puuid,
                name:player.name,
                lvl:'Unknown',
                TeamID:'Spectator',
                private:{
                    playerCardId:player.PlayerCardID,
                    playerTitleId:player.TitleID
                },
            }
            break
            case '--friends':
                HiddenPlayerCache[puuid] = {
                    name:player.name,
                    TeamID:"Blue",
                    Subject:puuid,
                    private: player.private || {playerCardId:'9fb348bc-41a0-91ad-8a3e-818035c4e561'},
                    lvl:player.lvl || "Offline",
                }
            break 
            case '--moreplayerscache': HiddenPlayerCache[puuid] = player
            break
        }

        HiddenPlayerCache[puuid] = {...HiddenPlayerCache[puuid], isFromHiddenCache:true, ...rank}
        openTab('-player', puuid, tab)
    })
}
function getPR(a,b){
    var c = ((a/(b))*100).toFixed(0)
    if(isNaN(c))return 0;
    return c
}

window.getPlayerHistory = async(UID, callback) => {
    if(HistoryCache[UID]){
        callback(HistoryCache[UID])
        return HistoryCache[UID]
    }

    var CompUpdates, Matches = [], CompOnly = true, RankUpdates, ws=0,stopWs=false
    const Comp = {
        kd:'?',
        hsr:'?',
        Matches:[],
    }

    if(data.data.customPlayers[UID] && data.data.customPlayers[UID][1] == true && data.me !== UID)return callback(Comp)
    CompUpdates = await GET('PD', `/match-history/${data.data.apiVersion[8]}/history/${UID}?startIndex=0&endIndex=${data.data.HistoryLength}${CompOnly ? '&queue=competitive' : ''}`)
    RankUpdates = await GET('PD', `/mmr/${data.data.apiVersion[9]}/players/${UID}/competitiveupdates?startIndex=0&endIndex=${data.data.HistoryLength}${CompOnly ? '&queue=competitive' : ''}`)

    if(CompUpdates.error) return document.getElementById('playerContent').innerHTML = `<h2>Failed to load</h2>`
    RankUpdates.Matches = RankUpdates.Matches.filter(x => x.RankedRatingEarned !== -3)

    for(var i=0; CompUpdates.History && i<CompUpdates.History.length;i++){
        const Game = CompUpdates.History[i]
        if(MatchCache[Game.MatchID + UID]) {
            Matches.push(MatchCache[Game.MatchID + UID])
            continue
        }

        var Match = await GET('PD', `/match-details/${data.data.apiVersion[10]}/matches/${Game.MatchID}`)
        if(!Match.players)continue
        MatchCache[Game.MatchID + UID] = Match
        Match.vid = Game.MatchID + UID
        var player = Match.players.filter(x=>x.subject === UID)[0]
        var team = Match.teams.filter(x=>x.teamId == player.teamId)[0]
        var enemy = Match.teams.filter(x=>x.teamId !== player.teamId)[0]
        Match.win = team.won
        Match.player = player
        Match.score = [team.roundsWon, enemy.roundsWon];
        Match.agent = data.agents[player.characterId.toLowerCase()]
        Match.stats = player.stats
        Match.stats.acs = (player.stats.score/Match.roundResults.length).toFixed(0)
        Match.map = data.data.codenames[Match.matchInfo.mapId.split('/')[3]]
        Match.hs = 0; Match.bs= 0; Match.ls = 0;
        Match.kpr = (player.stats.kills/Match.roundResults.length).toFixed(1)
        Match.mvp = Match.players.filter(x=>x.stats.score>player.stats.score)[0] ? false : true
        Match.tmvp = Match.players.filter(x=>x.stats.score>player.stats.score && x.teamId === player.teamId)[0] ? false : true
        Match.bf = Match.players.filter(x=>player.stats.score<x.stats.score && x.teamId === player.teamId).length >= 4
        Match.mvp = Match.mvp ? 2 : Match.tmvp ? 1 : 0
        Match.players.sort((a,b) => (a.stats.score > b.stats.score) ? 1 : ((b.stats.score > a.stats.score) ? -1 : 0))
        var me = Match.players.filter(x=>x.subject == UID)[0]
        if(i==0) Match.win ? ws=1 : ws=-1
        else {
          if(!stopWs){
            if(ws>0){
                if(Match.win)ws++
                else stopWs = true;
            } else {
                if(!Match.win){ ws--}
                else stopWs = true 
            }
          }
        }
        var dpr = 0
        player.roundDamage && player.roundDamage.forEach(dmg=>{
            dpr+= dmg.damage
        })
        Match.dpr = dpr/Match.roundResults.length
        if(isNaN(Match.dpr)) Match.dpr = 0
        Match.roundFB = {}
        Match.multiKills = {}
        Match.MVPscore = Match.players.indexOf(me) + 1
        Match.players.reverse()
        Match.pos = Match.players.indexOf(me) + 1
        delete Match.stats.abilityCasts

        Match.kills.forEach(kill=>{
            if(!Match.roundFB[kill.round])Match.roundFB[kill.round] = kill.killer

            if(kill.killer == player.subject && kill.victim !== player.subject){
            if(!Match.multiKills[kill.round])
            Match.multiKills[kill.round] = 0;

            Match.multiKills[kill.round] += 1
            }
        })

        var multikills = Object.values(Match.multiKills)
        for(var y=0; y<=6; y++){
            Match[y+2 + 'k'] = multikills.filter(x=>x==y+2).length
        } 
        Match.fb = Object.values(Match.roundFB).filter(x=>x==UID).length

        await Match.roundResults.forEach(round => {
            var p = round.playerStats.filter(x=>x.subject === player.subject)[0]
            p.damage.forEach(shot=>{
                Match.hs += shot.headshots
                Match.bs += shot.bodyshots
                Match.ls += shot.legshots
            })
        })

        Match.allShots = Match.hs+Match.bs+Match.ls
        Match.hsr = getPR(Match.hs, Match.allShots)
        Match.bsr = getPR(Match.bs, Match.allShots)
        Match.lsr = getPR(Match.ls, Match.allShots)
       // Match = (({win,score,map,agent,stats,hs,nhs,hsr,mvp}) => ({win,score,map,agent,stats,hs,nhs,hsr,mvp}))(Match);
        Matches.push(Match)
    }

    var bs=0,ls=0,hs=0,k=0,d=0,acs=0,avgAgents={},mvps=0,fbs=0,dpr=0
    await Matches.forEach(match=>{ dpr+=match.dpr; bs+=match.bs; ls+= match.ls; mvps+=match.MVPscore;fbs+=match.fb; hs+=match.hs; k+=match.stats.kills; d+=match.stats.deaths;acs+=parseInt(match.stats.acs); if(!avgAgents[match.agent])avgAgents[match.agent] = 0; avgAgents[match.agent]++; })
    Comp.FavAgents = avgAgents
    Comp.MVPscore = mvps/Matches.length
    var mostUsed = ['None', 0]
    for(var agent in Comp.FavAgents){
        if(Comp.FavAgents[agent] > mostUsed[1])
        mostUsed = [agent, Comp.FavAgents[agent]]
    }

    var c = RankUpdates.Matches,startRank = c[c.length-1].TierBeforeUpdate,rrData = [],xdata=[],xval=1;

for(var i=c.length-1; i >= 0; i--){
    var rr = c[i].RankedRatingAfterUpdate,
    rankDiff = c[i].TierAfterUpdate - startRank
    if(rankDiff > 0)rr = rr + (rankDiff*100)
    if(rankDiff < 0)rr = -((rankDiff*-100)-rr)
    rrData.push(rr)
    xdata.push(xval)
    xval++
}

    Comp.FavAgent = mostUsed
    Comp.ws=ws
    Comp.dpr = (dpr/Matches.length).toFixed(0)
    Comp.avgfb = (fbs/Matches.length).toFixed(1)
    Comp.allShots = hs+bs+ls
    Comp.rrData = rrData
    Comp.xdata = xdata
    Comp.hsr = getPR(hs, Comp.allShots) 
    Comp.bsr = getPR(bs, Comp.allShots) 
    Comp.lsr = getPR(ls, Comp.allShots) 
    Comp.bs = bs
    Comp.ls = ls
    Comp.hs = hs
    Comp.avgacs = (acs/Matches.length).toFixed(0)
    Comp.avgk = (k/Matches.length).toFixed(0)
    Comp.kd = (k/d).toFixed(1)
    Comp.Matches = Matches
    Comp.RankUpdates = RankUpdates
    Comp.History = CompUpdates
    Comp.time = Date.now()
    HistoryCache[UID] = Comp
    callback(Comp)

    return Comp
}

window.startRecording = () => {
    window.recording = true
    window.newKey = ''
    window.lastKey = ''
    document.getElementById('keybind').style.backgroundColor = '#ff4a4a'
}

var idek = {
    'A':() => { openTab('-aimlab') },
    'S':() => { openTab('-chat') }
}

document.addEventListener('keydown', (event) => {
    if(event.key == 'Enter' && CurrentTab.startsWith('--')){ content.focus() }
    if(idek[event.key] && event.shiftKey && event.ctrlKey)idek[event.key]()

    if(window.recording){
        var rawKey = event.key
        var key = rawKey.replace("Control", 'CTRL').toUpperCase()

        if(window.lastKey == rawKey)return;
        if(window.newKey !== '') key = '+'+key

        window.newKey += key
        window.lastKey = rawKey
        document.getElementById('keybind').innerHTML = window.newKey
    }
})

document.addEventListener('keyup', (event) => {
    if(window.recording){
        window.recording = false
        if(['ALT','SHIFT','CTRL'].includes(window.newKey))window.newKey += '+TAB'
        window.settings.ToggleKeybind = window.newKey
        document.getElementById('keybind').style.backgroundColor = ''
        document.getElementById('keybind').innerHTML = window.newKey
        updateSettings();
    }
})