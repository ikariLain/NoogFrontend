import {
  CallControls,
  CallingState,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import type { User } from '@stream-io/video-react-sdk';
import { CustomCallRecordButton } from './ConvertAudioFile/ConvertSendAudio';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './videoCall.css';
// Remove dotenv import; not needed in frontend

//TODO: Add envoriment variables in a .env file
const apiKey =
const token =
const userId =
const callId =

const user: User = {
  id: userId,
  name: 'Oliver',
  image: 'https://getstream.io/random_svg/?id=oliver&name=Oliver',
};

const client = new StreamVideoClient({ apiKey, user, token });
const call = client.call('default', callId);
call.join({ create: true });

export default function VideoCallSetup() {
  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <MyUILayout />
      </StreamCall>
    </StreamVideo>
  );
}

export const MyUILayout = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) {
    return <div>Loading...</div>;
  }

  return (
     <StreamTheme>
      <div className="call-container">
        <div className="call-header">
          <h2>Video Call - {user.name}</h2>
          <button className="leave-btn" onClick={() => call.leave()}>
            Leave Call
          </button>
        </div>

        <div className="video-area">
          <SpeakerLayout participantsBarPosition='bottom' />
        </div>

        <div className="controls-area">
          <CallControls />
          <CustomCallRecordButton /> {/* LÄGG TILL INSPELNINGSKNAPPEN HÄR */}
        </div>
      </div>
    </StreamTheme>
  );
};