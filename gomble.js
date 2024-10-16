const fetch = require('node-fetch');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRequestExpired = (expiredAt) => {
  const currentTime = Date.now();
  const oneHourInMilliseconds = 60 * 60 * 1000;
  return (expiredAt - currentTime) < oneHourInMilliseconds;
};

const getSessionData = (lineIndex) => {
  const sessionData = fs.readFileSync('query.txt', 'utf-8').split('\n')[lineIndex];
  if (!sessionData) return null;
  const queryParams = new URLSearchParams(sessionData);
  const userData = JSON.parse(decodeURIComponent(queryParams.get('user')));

  return {
    initData: queryParams.toString(),
    initDataUnsafe: {
      query_id: queryParams.get('query_id'),
      user: userData,
      auth_date: queryParams.get('auth_date'),
      hash: queryParams.get('hash')
    }
  };
};

const mainApi = async (subUrl, method, accessToken = null, body = null) => {
  await delay(1000); 

  const baseUrl = 'https://squad-api.gomble.io/';
  const headers = {
    accept: '*/*',
    'content-type': 'application/json'
  };

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(baseUrl + subUrl, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request gagal dengan status ${response.status}: ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error dalam request API ke ${subUrl}: ${error.message}`);
    return null;
  }
};

const fetchAuth = async (lineIndex) => {
  const sessionData = getSessionData(lineIndex);
  if (!sessionData) {
    console.error('Gagal mendapatkan data sesi.');
    return null;
  }
  console.log('Melakukan autentikasi...');
  const authData = await mainApi('auth/telegram', 'POST', null, sessionData);
  if (authData) {
    console.log('Login berhasil, token diterima:', authData.accessToken);
    return authData.accessToken;
  } else {
    console.error('Gagal melakukan login');
    return null;
  }
};

const fetchUser = async (accessToken) => {
  console.log('Mendapatkan informasi user...');
  const userData = await mainApi('user', 'GET', accessToken);
  if (userData) {
    console.log('Informasi User:');
    console.log(`NickName: ${userData.nickName}`);
    console.log(`Level: ${userData.level}`);
    console.log(`SquadCoin: ${userData.squadCoin}`);
    console.log(`Fuel: ${userData.fuel}`);
  } else {
    console.error('Gagal mendapatkan informasi user.');
  }
  return userData;
};

const squadBoost = async (accessToken, fuelAmount) => {
  console.log('Melakukan squad boost...');
  const boostData = await mainApi('squad/fill/fuel', 'POST', accessToken, {
    squadName: 'DAKI',
    fuelAmount
  });

  if (boostData) {
    console.log('Squad Boost berhasil:');
    boostData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName}: ${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal melakukan squad boost.');
  }
};

const claimDailyReward = async (accessToken) => {
  console.log('Mengklaim daily squad reward...');
  const dailyReward = await mainApi('squad/claim/daily', 'POST', accessToken, {
    squadName: 'DAKI',
    grade: 1
  });

  if (dailyReward) {
    console.log('Response dari klaim daily reward:');
    console.log(dailyReward);
  } else {
    console.error('Gagal mengklaim daily reward.');
  }
};

const claimRankReward = async (accessToken) => {
  console.log('Mengklaim reward rank...');
  const claimData = await mainApi('squad/claim/rank', 'POST', accessToken, { squadName: 'DAKI' });
  if (claimData) {
    console.log('Rank reward diterima:');
    claimData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName} +${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal mengklaim reward rank.');
  }
};

const claimGroupMission = async (accessToken, missionGroupId) => {
  console.log('Mengklaim group mission...');
  const claimData = await mainApi('mission/claim/group', 'POST', accessToken, { missionGroupId });
  if (claimData) {
    console.log('Group Mission reward diterima:');
    claimData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName} +${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal mengklaim group mission.');
  }
};

const claimSquadMission = async (accessToken, squadMissionId) => {
  console.log('Mengklaim squad mission...');
  const claimData = await mainApi('squadMission/claim', 'POST', accessToken, {
    squadName: 'DAKI',
    squadMissionId,
    targetStepCount: 10000
  });
  if (claimData) {
    console.log('Squad Mission reward diterima:');
    claimData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName} +${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal mengklaim squad mission.');
  }
};

const claimMission = async (accessToken, missionId) => {
  console.log(`Mengklaim misi dengan ID: ${missionId}`);
  const claimData = await mainApi('mission/claim', 'POST', accessToken, { missionId });
  if (claimData) {
    console.log('Mission Claim Reward:');
    claimData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName} +${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal mengklaim misi.');
  }
};

const acceptHelp = async (accessToken, requestId) => {
  console.log(`Mencoba menerima bantuan dengan squadAssistanceRequestId: ${requestId}`);
  const helpData = await mainApi('squad/assistance/accept', 'POST', accessToken, {
    squadName: 'DAKI',
    squadAssistanceRequestId: requestId
  });

  if (helpData) {
    console.log('Help diterima:');
    helpData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName} +${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal menerima bantuan.');
  }
};

const fetchSquadHelpList = async (accessToken) => {
  console.log('Mendapatkan daftar bantuan squad...');
  const helpList = await mainApi('squad/assistance?squadName=DAKI', 'GET', accessToken);
  if (!helpList) {
    console.error('Gagal mendapatkan daftar bantuan.');
    return;
  }

  let accepted = false;

  for (const request of helpList.squadAssistanceInfoList) {
    if (!request.isAccepted && !request.isRequestMine && !isRequestExpired(request.expiredAt)) {
      console.log(`Menerima bantuan: ${request.nickName}`);
      await acceptHelp(accessToken, request.squadAssistanceRequestId);
      accepted = true;
    } else if (isRequestExpired(request.expiredAt)) {
      console.log(`Permintaan dari ${request.nickName} sudah kadaluwarsa.`);
    }
  }

  if (accepted) {
    await fetchSquadHelpList(accessToken);
  }
};

const requestHelp = async (accessToken) => {
  console.log('Mengirim permintaan bantuan...');
  const helpData = await mainApi('squad/assistance/request', 'POST', accessToken, { squadName: 'DAKI' });
  if (helpData) {
    console.log('Permintaan bantuan berhasil dikirim:');
    helpData.rewardItemList.forEach(reward => {
      console.log(`${reward.rewardName} +${reward.rewardAmount}`);
    });
  } else {
    console.error('Gagal mengirim permintaan bantuan.');
  }
};

const fetchMission = async (accessToken) => {
  console.log('Mendapatkan misi...');
  const missionData = await mainApi('mission', 'GET', accessToken);
  if (!missionData) {
    console.error('Gagal mendapatkan misi.');
    return;
  }

  let claimed = false;

  for (const group of missionData.missionList) {
    if (group.isGroupRewardClaimed === false && group.userHasMissionList.every(mission => mission.isCompleted)) {
      console.log(`Mengklaim misi grup: ${group.missionGroupName}`);
      await claimGroupMission(accessToken, group.missionGroupId);
      claimed = true;
    }

    for (const mission of group.userHasMissionList) {
      if (mission.isCompleted && !mission.isMissionRewardClaimed) {
        console.log(`Mengklaim misi: ${mission.missionName}`);
        await claimMission(accessToken, mission.missionId); 
        claimed = true;
      }
    }
  }

  if (claimed) {
    await fetchMission(accessToken);
  }
};

const processLine = async (lineIndex) => {
  const accessToken = await fetchAuth(lineIndex);
  if (!accessToken) return false;

  let userData = await fetchUser(accessToken);
  if (userData && userData.fuel > 0) {
    await squadBoost(accessToken, userData.fuel);
  }

  await claimRankReward(accessToken);   
  await fetchSquadHelpList(accessToken);
  await requestHelp(accessToken);

  await fetchMission(accessToken);

  userData = await fetchUser(accessToken);
  while (userData && userData.fuel > 0) {
    await squadBoost(accessToken, userData.fuel);
    await claimDailyReward(accessToken); 
    await fetchMission(accessToken);
    userData = await fetchUser(accessToken);
  }

  await claimDailyReward(accessToken);  

  return true;
};

const dynamicCountdown = async (duration) => {
  let secondsRemaining = duration;

  const interval = setInterval(() => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    process.stdout.write(`\rMenunggu ${minutes}:${seconds < 10 ? '0' : ''}${seconds} sampai mulai ulang...`);

    secondsRemaining--;

    if (secondsRemaining < 0) {
      clearInterval(interval);
      process.stdout.write('\n');
    }
  }, 1000);

  await new Promise(resolve => setTimeout(resolve, duration * 1000));
};

const main = async () => {
  let lineIndex = 0;
  const lines = fs.readFileSync('query.txt', 'utf-8').split('\n').filter(Boolean);

  while (true) {
    while (lineIndex < lines.length) {
      console.log(`Memproses baris sesi ${lineIndex + 1}...`);
      const success = await processLine(lineIndex);
      if (success) {
        console.log(`Baris ${lineIndex + 1} selesai diproses.`);
        lineIndex++;
      } else {
        console.log(`Gagal memproses baris ${lineIndex + 1}, melewati...`);
        lineIndex++;
      }
    }

    console.log('Semua sesi telah diproses. Menunggu 15 menit sebelum memulai ulang...');
    await dynamicCountdown(900);  
    lineIndex = 0;
  }
};

main();
