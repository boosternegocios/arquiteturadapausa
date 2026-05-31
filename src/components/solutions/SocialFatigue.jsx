import React from 'react'

export const SocialFatigue = ({ data, onChange }) => {
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // 01: Inventário do Convívio
  const renderAct01 = () => {
    const listLen = [0,1,2,3,4]
    const drainers = data?.act01?.drainers || ['', '', '', '', '']
    const boosters = data?.act01?.boosters || ['', '', '', '', '']

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. Inventário do Convívio</h3>
        <p className="text-slate-500 font-medium mb-10">Faça um inventário das pessoas ao seu redor. Identifique e limite o tempo com relações que geram exaustão, e procure investir tempo nas que abastecem sua energia.</p>
        
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
          <div className="flex-1 bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100">
            <h4 className="text-base font-black text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#eb6496]/20 text-[#eb6496] flex items-center justify-center">↓</span>
              Pessoas que Drenam Energia
            </h4>
            <div className="flex flex-col gap-5">
              {listLen.map(i => (
                <input 
                  key={`drain-${i}`}
                  type="text" 
                  value={drainers[i]}
                  placeholder={`Nome ou Perfil ${i+1}`}
                  onChange={(e) => {
                    const n = [...drainers]; n[i] = e.target.value; updateData('act01', 'drainers', n)
                  }}
                  className="w-full bg-white p-4 rounded-xl border border-transparent shadow-sm outline-none focus:border-[#eb6496] transition-all text-sm font-medium text-slate-700" 
                />
              ))}
            </div>
          </div>

          <div className="flex-1 bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100">
            <h4 className="text-base font-black text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#1ed7a4]/20 text-[#1ed7a4] flex items-center justify-center">↑</span>
              Pessoas que Abastecem Energia
            </h4>
            <div className="flex flex-col gap-5">
              {listLen.map(i => (
                <input 
                  key={`boost-${i}`}
                  type="text" 
                  value={boosters[i]}
                  placeholder={`Nome ou Perfil ${i+1}`}
                  onChange={(e) => {
                    const n = [...boosters]; n[i] = e.target.value; updateData('act01', 'boosters', n)
                  }}
                  className="w-full bg-white p-4 rounded-xl border border-transparent shadow-sm outline-none focus:border-[#1ed7a4] transition-all text-sm font-medium text-slate-700" 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 02: Mapa Visual de Interações
  const renderAct02 = () => {
    const listLen = [0,1,2,3,4]
    const presencial = data?.act02?.presencial || ['', '', '', '', '']
    const online = data?.act02?.online || ['', '', '', '', '']

    return (
      <div className="mb-16 bg-[#004b4c] p-8 md:p-10 rounded-[3rem] shadow-xl animate-in fade-in relative overflow-hidden" style={{animationDelay: '100ms'}}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-[#1ed7a4]/5 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-white mb-2 font-display">02. Mapa Visual das Interações</h3>
          <p className="text-[#1ed7a4] font-medium mb-10">Contabilize os eventos presenciais e online do seu último mês. O que você pode fazer intencionalmente para mudar esse balanço para melhor?</p>
          
          <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
            <div className="flex-1">
              <h4 className="text-sm font-black text-white mb-6 uppercase tracking-widest pl-4 border-l-4 border-amber-400">
                Eventos ou interações presenciais que fizeram a diferença
              </h4>
              <div className="flex flex-col gap-5 pl-4 border-l border-white/10">
                {listLen.map(i => (
                  <input 
                    key={`presencial-${i}`}
                    type="text" 
                    value={presencial[i]}
                    placeholder={`Ex: Almoço com amigos, café com equipe...`}
                    onChange={(e) => {
                      const n = [...presencial]; n[i] = e.target.value; updateData('act02', 'presencial', n)
                    }}
                    className="w-full bg-white/5 p-4 rounded-xl border border-transparent outline-none focus:bg-white/10 focus:border-amber-400/50 transition-all text-sm font-medium text-white placeholder:text-white/30" 
                  />
                ))}
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-black text-white mb-6 uppercase tracking-widest pl-4 border-l-4 border-[#eb6496]">
                Reuniões virtuais que teriam sido melhores presenciais
              </h4>
              <div className="flex flex-col gap-5 pl-4 border-l border-white/10">
                {listLen.map(i => (
                  <input 
                    key={`online-${i}`}
                    type="text" 
                    value={online[i]}
                    placeholder={`Ex: Feedback mensal, reunião de alinhamento...`}
                    onChange={(e) => {
                      const n = [...online]; n[i] = e.target.value; updateData('act02', 'online', n)
                    }}
                    className="w-full bg-white/5 p-4 rounded-xl border border-transparent outline-none focus:bg-white/10 focus:border-[#eb6496]/50 transition-all text-sm font-medium text-white placeholder:text-white/30" 
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-white/10">
             <h4 className="text-xs font-black uppercase text-[#1ed7a4] tracking-widest mb-3">Plano de Ação</h4>
             <textarea 
                placeholder="Como irei converter interações online frias em presença ou limitar o excesso digital?"
                value={data?.act02?.action || ''}
                onChange={(e) => updateData('act02', 'action', e.target.value)}
                className="w-full min-h-[100px] bg-transparent outline-none transition-colors text-sm text-white placeholder:text-white/40 resize-none font-medium" 
              />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">RECUPERAÇÃO SOCIAL</h2>
        <p className="text-lg text-slate-500 font-medium">Você obteve um alto índice de tensão Social. Mapeie suas relações para proteger sua energia vital.</p>
      </div>

      {renderAct01()}
      {renderAct02()}
    </div>
  )
}
